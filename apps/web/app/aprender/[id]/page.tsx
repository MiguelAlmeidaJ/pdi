'use client';

import Hls from 'hls.js';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect,useMemo,useRef,useState } from 'react';
import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiLock,
  FiPause,
  FiPlay,
  FiVolume2,
  FiVolumeX,
} from 'react-icons/fi';
import { AppLayout } from '../../../components/app-layout';
import { api,API_URL } from '../../../lib/api';

type LessonProgress={
  watchedSeconds:number;
  lastValidPosition:number;
  percentage:number;
  completedAt?:string|null;
};

type Lesson={
  id:string;
  title:string;
  description?:string|null;
  order:number;
  videoStatus:string;
  durationSeconds?:number|null;
  minCompletionPercent:number;
  unlocked:boolean;
  progress:LessonProgress;
};

type CourseModule={
  id:string;
  title:string;
  description?:string|null;
  order:number;
  unlocked:boolean;
  lessons:Lesson[];
};

type Course={
  id:string;
  title:string;
  description?:string|null;
  qualification?:{id:string;name:string}|null;
  progress:{completedLessons:number;totalLessons:number;percentage:number};
  modules:CourseModule[];
};

type SessionResponse={
  sessionId:string;
  manifestUrl:string;
  allowedPosition:number;
  durationSeconds:number;
  minCompletionPercent:number;
  completed:boolean;
};

type HeartbeatResponse={
  accepted:boolean;
  allowedPosition:number;
  maxWatchedPosition:number;
  watchedSeconds:number;
  percentage:number;
  completed:boolean;
  suspiciousEvents:number;
};

function timeLabel(value:number){
  const seconds=Math.max(0,Math.floor(value||0));
  const minutes=Math.floor(seconds/60);
  const rest=seconds%60;
  return minutes+':'+String(rest).padStart(2,'0');
}

export default function AprenderCurso(){
  const params=useParams<{id:string}>();
  const courseId=params.id;
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const hlsRef=useRef<Hls|null>(null);
  const sessionRef=useRef<string|null>(null);
  const heartbeatRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const lastPlaybackPositionRef=useRef(0);
  const [course,setCourse]=useState<Course|null>(null);
  const [selectedLessonId,setSelectedLessonId]=useState<string|null>(null);
  const [session,setSession]=useState<SessionResponse|null>(null);
  const [currentTime,setCurrentTime]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [muted,setMuted]=useState(false);
  const [error,setError]=useState('');
  const [loadingLesson,setLoadingLesson]=useState(false);

  async function loadCourse(){
    try{
      const data=await api<Course>('/learning/my/courses/'+courseId);
      setCourse(data);
      setError('');
      setSelectedLessonId(current=>{
        if(current&&data.modules.some(module=>module.lessons.some(lesson=>lesson.id===current)))return current;
        const lessons=data.modules.flatMap(module=>module.lessons);
        return (lessons.find(lesson=>lesson.unlocked&&!lesson.progress.completedAt)||lessons.find(lesson=>lesson.unlocked))?.id||null;
      });
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao carregar curso');
    }
  }

  useEffect(()=>{void loadCourse()},[courseId]);

  const lessons=useMemo(()=>course?.modules.flatMap(module=>module.lessons)||[],[course]);
  const selectedLesson=lessons.find(lesson=>lesson.id===selectedLessonId)||null;

  async function closeSession(){
    if(heartbeatRef.current){
      clearInterval(heartbeatRef.current);
      heartbeatRef.current=null;
    }
    hlsRef.current?.destroy();
    hlsRef.current=null;
    const activeSession=sessionRef.current;
    sessionRef.current=null;
    if(activeSession){
      try{await api('/learning/sessions/'+activeSession+'/end',{method:'POST'})}catch{}
    }
  }

  async function startLesson(lesson:Lesson){
    if(!lesson.unlocked||lesson.videoStatus!=='READY')return;

    await closeSession();
    setSelectedLessonId(lesson.id);
    setLoadingLesson(true);
    setPlaying(false);
    setError('');

    try{
      const result=await api<SessionResponse>('/learning/lessons/'+lesson.id+'/session',{method:'POST'});
      setSession(result);
      sessionRef.current=result.sessionId;
      lastPlaybackPositionRef.current=result.allowedPosition;
      setCurrentTime(result.allowedPosition);

      const video=videoRef.current;
      if(!video)return;
      video.playbackRate=1;

      const mediaUrl=new URL(result.manifestUrl,new URL(API_URL).origin).toString();

      if(video.canPlayType('application/vnd.apple.mpegurl')){
        video.src=mediaUrl;
      }else if(Hls.isSupported()){
        const hls=new Hls({
          enableWorker:true,
          lowLatencyMode:false,
          backBufferLength:30,
        });
        hlsRef.current=hls;
        hls.loadSource(mediaUrl);
        hls.attachMedia(video);
      }else{
        throw new Error('Seu navegador não suporta reprodução HLS');
      }

      const seekToAllowed=()=>{
        if(Math.abs(video.currentTime-result.allowedPosition)>1){
          video.currentTime=result.allowedPosition;
        }
      };
      video.addEventListener('loadedmetadata',seekToAllowed,{once:true});

      heartbeatRef.current=setInterval(()=>void sendHeartbeat(),10000);
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao iniciar aula');
    }finally{
      setLoadingLesson(false);
    }
  }

  async function sendHeartbeat(){
    const video=videoRef.current;
    const sessionId=sessionRef.current;
    if(!video||!sessionId)return;

    try{
      const result=await api<HeartbeatResponse>('/learning/sessions/'+sessionId+'/heartbeat',{
        method:'PUT',
        body:JSON.stringify({
          position:video.currentTime,
          playing:!video.paused&&!video.ended,
          visible:document.visibilityState==='visible',
          playbackRate:video.playbackRate,
        }),
      });

      if(!result.accepted&&Math.abs(video.currentTime-result.allowedPosition)>1){
        video.currentTime=result.allowedPosition;
        lastPlaybackPositionRef.current=result.allowedPosition;
      }

      if(result.completed){
        await loadCourse();
      }
    }catch(e){
      setError(e instanceof Error?e.message:'Não foi possível validar o progresso da aula');
      video.pause();
    }
  }

  useEffect(()=>{
    if(selectedLesson&&!session&&selectedLesson.unlocked&&selectedLesson.videoStatus==='READY'){
      void startLesson(selectedLesson);
    }
  },[selectedLessonId,course?.id]);

  useEffect(()=>{
    function visibility(){
      if(document.visibilityState!=='visible'){
        videoRef.current?.pause();
        void sendHeartbeat();
      }
    }
    document.addEventListener('visibilitychange',visibility);
    return()=>document.removeEventListener('visibilitychange',visibility);
  },[]);

  useEffect(()=>()=>{void closeSession()},[]);

  function onTimeUpdate(){
    const video=videoRef.current;
    if(!video)return;
    setCurrentTime(video.currentTime);
    if(!video.seeking){
      lastPlaybackPositionRef.current=video.currentTime;
    }
  }

  function onSeeking(){
    const video=videoRef.current;
    if(!video)return;
    const previous=lastPlaybackPositionRef.current;
    if(video.currentTime>previous+1.25){
      video.currentTime=previous;
    }
  }

  function onRateChange(){
    const video=videoRef.current;
    if(video&&Math.abs(video.playbackRate-1)>.01)video.playbackRate=1;
  }

  async function togglePlay(){
    const video=videoRef.current;
    if(!video)return;
    if(video.paused){
      video.playbackRate=1;
      await video.play();
    }else{
      video.pause();
      await sendHeartbeat();
    }
  }

  function toggleMute(){
    const video=videoRef.current;
    if(!video)return;
    video.muted=!video.muted;
    setMuted(video.muted);
  }

  const selectedIndex=lessons.findIndex(lesson=>lesson.id===selectedLessonId);
  const nextLesson=selectedIndex>=0?lessons[selectedIndex+1]:null;

  if(!course){
    return <AppLayout title="Aprendizado" description="Carregando curso...">{error?<div className="form-error">{error}</div>:<div className="skeleton-card"/>}</AppLayout>;
  }

  return <AppLayout title={course.title} description={course.description||'Continue seu aprendizado na Trilha.'}>
    <Link href="/meu-pdi" className="back-link action-with-icon"><FiArrowLeft/> Voltar para Minha Trilha</Link>
    {error&&<div className="form-error">{error}</div>}

    <section className="course-player-layout">
      <div className="course-player-main">
        <div className="course-video-shell" onContextMenu={event=>event.preventDefault()}>
          {selectedLesson?.videoStatus==='READY'
            ? <video
                ref={videoRef}
                className="course-video"
                playsInline
                disablePictureInPicture
                onTimeUpdate={onTimeUpdate}
                onSeeking={onSeeking}
                onRateChange={onRateChange}
                onPlay={()=>setPlaying(true)}
                onPause={()=>setPlaying(false)}
                onEnded={()=>{setPlaying(false);void sendHeartbeat()}}
              />
            : <div className="course-video-placeholder"><FiVideoFallback/><strong>{selectedLesson?'Vídeo ainda não está pronto':'Selecione uma aula'}</strong></div>}

          {selectedLesson?.videoStatus==='READY'&&<div className="course-video-controls">
            <button onClick={togglePlay} disabled={loadingLesson} aria-label={playing?'Pausar':'Reproduzir'}>{playing?<FiPause/>:<FiPlay/>}</button>
            <div className="course-video-progress">
              <span style={{width:Math.min(100,(currentTime/(session?.durationSeconds||1))*100)+'%'}}/>
            </div>
            <span>{timeLabel(currentTime)} / {timeLabel(session?.durationSeconds||selectedLesson.durationSeconds||0)}</span>
            <button onClick={toggleMute} aria-label={muted?'Ativar som':'Silenciar'}>{muted?<FiVolumeX/>:<FiVolume2/>}</button>
          </div>}
        </div>

        {selectedLesson&&<div className="course-player-copy">
          <div>
            <p className="eyebrow">AULA ATUAL</p>
            <h2>{selectedLesson.title}</h2>
            <p>{selectedLesson.description||'Assista à aula completa para liberar a próxima etapa.'}</p>
          </div>
          <div className="course-player-rule">
            <FiClock/>
            <span>Conclusão em {selectedLesson.minCompletionPercent}% assistido. Avanço manual e velocidade diferente de 1x não contam.</span>
          </div>
        </div>}

        {nextLesson&&<div className="course-next-lesson">
          <div><small>PRÓXIMA AULA</small><strong>{nextLesson.title}</strong></div>
          <button disabled={!nextLesson.unlocked||nextLesson.videoStatus!=='READY'} onClick={()=>void startLesson(nextLesson)}>
            {nextLesson.unlocked?'Continuar':'Bloqueada'} <FiChevronRight/>
          </button>
        </div>}
      </div>

      <aside className="course-outline">
        <div className="course-outline-head">
          <div><p className="eyebrow">CONTEÚDO</p><h2>Sua jornada neste curso</h2></div>
          <strong>{course.progress.percentage}%</strong>
        </div>
        <div className="course-outline-progress"><span style={{width:course.progress.percentage+'%'}}/></div>

        <div className="course-module-outline">
          {course.modules.map((module,moduleIndex)=><section key={module.id}>
            <div className="course-module-outline-head">
              <span>{String(moduleIndex+1).padStart(2,'0')}</span>
              <div><strong>{module.title}</strong><small>{module.lessons.filter(lesson=>lesson.progress.completedAt).length}/{module.lessons.length} concluídas</small></div>
              {!module.unlocked&&<FiLock/>}
            </div>

            <div className="course-lesson-outline">
              {module.lessons.map((lesson,lessonIndex)=>{
                const active=lesson.id===selectedLessonId;
                const done=Boolean(lesson.progress.completedAt);
                return <button
                  key={lesson.id}
                  className={(active?'active ':'')+(done?'done ':'')+(!lesson.unlocked?'locked':'')}
                  disabled={!lesson.unlocked||lesson.videoStatus!=='READY'}
                  onClick={()=>void startLesson(lesson)}
                >
                  <span className="course-lesson-state">{done?<FiCheck/>:!lesson.unlocked?<FiLock/>:<FiPlay/>}</span>
                  <div><strong>{moduleIndex+1}.{lessonIndex+1} {lesson.title}</strong><small>{timeLabel(lesson.durationSeconds||0)} · {lesson.progress.percentage}%</small></div>
                </button>;
              })}
            </div>
          </section>)}
        </div>
      </aside>
    </section>
  </AppLayout>;
}

function FiVideoFallback(){
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>;
}
