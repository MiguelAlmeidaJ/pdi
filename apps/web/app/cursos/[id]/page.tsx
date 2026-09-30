'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect,useMemo,useState } from 'react';
import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiEdit3,
  FiPlus,
  FiRefreshCw,
  FiUploadCloud,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import { AppLayout } from '../../../components/app-layout';
import { api } from '../../../lib/api';

type Lesson={
  id:string;
  title:string;
  description?:string|null;
  order:number;
  active:boolean;
  videoStatus:'EMPTY'|'PROCESSING'|'READY'|'ERROR';
  durationSeconds?:number|null;
  minCompletionPercent:number;
  processingError?:string|null;
};

type Module={
  id:string;
  title:string;
  description?:string|null;
  order:number;
  active:boolean;
  lessons:Lesson[];
};

type CourseProgress={
  totalLessons:number;
  students:{
    user:{id:string;name:string;email:string};
    completedLessons:number;
    watchedSeconds:number;
    startedAt?:string|null;
    updatedAt:string;
    percentage:number;
    suspiciousEvents:number;
  }[];
};

type Course={
  id:string;
  title:string;
  description?:string|null;
  active:boolean;
  qualification?:{
    id:string;
    name:string;
    team?:{id:string;name:string}|null;
  }|null;
  modules:Module[];
};

function formatDuration(seconds?:number|null){
  if(!seconds)return '—';
  const minutes=Math.floor(seconds/60);
  const rest=seconds%60;
  return minutes+':'+String(rest).padStart(2,'0');
}

export default function CursoDetalhe(){
  const params=useParams<{id:string}>();
  const courseId=params.id;

  const [course,setCourse]=useState<Course|null>(null);
  const [progress,setProgress]=useState<CourseProgress>({totalLessons:0,students:[]});
  const [error,setError]=useState('');
  const [moduleOpen,setModuleOpen]=useState(false);
  const [lessonModule,setLessonModule]=useState<Module|null>(null);
  const [uploadLesson,setUploadLesson]=useState<Lesson|null>(null);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [moduleForm,setModuleForm]=useState({title:'',description:''});
  const [lessonForm,setLessonForm]=useState({title:'',description:'',minCompletionPercent:90});
  const [videoFile,setVideoFile]=useState<File|null>(null);

  async function load(){
    try{
      const [data,progressData]=await Promise.all([
        api<Course>('/learning/courses/'+courseId),
        api<CourseProgress>('/learning/courses/'+courseId+'/progress'),
      ]);
      setCourse(data);
      setProgress(progressData);
      setError('');
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao carregar curso');
    }
  }

  useEffect(()=>{void load()},[courseId]);

  const processing=useMemo(
    ()=>course?.modules.some(module=>module.lessons.some(lesson=>lesson.videoStatus==='PROCESSING'))||false,
    [course]
  );

  useEffect(()=>{
    if(!processing)return;
    const timer=setInterval(()=>void load(),5000);
    return()=>clearInterval(timer);
  },[processing,courseId]);

  async function createModule(){
    setSaving(true);setError('');
    try{
      await api('/learning/courses/'+courseId+'/modules',{
        method:'POST',
        body:JSON.stringify(moduleForm),
      });
      setModuleForm({title:'',description:''});
      setModuleOpen(false);
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao criar módulo');
    }finally{
      setSaving(false);
    }
  }

  async function createLesson(){
    if(!lessonModule)return;
    setSaving(true);setError('');
    try{
      await api('/learning/modules/'+lessonModule.id+'/lessons',{
        method:'POST',
        body:JSON.stringify(lessonForm),
      });
      setLessonForm({title:'',description:'',minCompletionPercent:90});
      setLessonModule(null);
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao criar aula');
    }finally{
      setSaving(false);
    }
  }

  async function uploadVideo(){
    if(!uploadLesson||!videoFile)return;
    setUploading(true);setError('');
    try{
      const form=new FormData();
      form.append('file',videoFile);
      await api('/learning/lessons/'+uploadLesson.id+'/video',{
        method:'POST',
        body:form,
      });
      setUploadLesson(null);
      setVideoFile(null);
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao enviar vídeo');
    }finally{
      setUploading(false);
    }
  }

  async function toggleCourse(){
    if(!course)return;
    try{
      await api('/learning/courses/'+course.id,{
        method:'PATCH',
        body:JSON.stringify({active:!course.active}),
      });
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao alterar status do curso');
    }
  }

  if(!course){
    return <AppLayout title="Curso" description="Carregando estrutura do curso...">{error?<div className="form-error">{error}</div>:<div className="skeleton-card"/>}</AppLayout>;
  }

  const lessons=course.modules.flatMap(module=>module.lessons);
  const readyLessons=lessons.filter(lesson=>lesson.videoStatus==='READY').length;

  return <AppLayout
    title={course.title}
    description={course.description||'Organize módulos, aulas e vídeos deste treinamento.'}
    action={<button className={course.active?'secondary-button':'primary-action'} onClick={toggleCourse}>{course.active?'Desativar curso':'Ativar curso'}</button>}
  >
    {error&&<div className="form-error">{error}</div>}

    <Link href="/cursos" className="back-link action-with-icon"><FiArrowLeft/> Voltar para cursos</Link>

    <section className="learning-course-editor-hero">
      <div>
        <p className="eyebrow">CURSO INTERNO</p>
        <h2>{course.title}</h2>
        <p>{course.qualification?.team?.name||'Sem time'} · {course.qualification?.name||'Sem qualificação vinculada'}</p>
      </div>
      <div className="learning-editor-stats">
        <div><strong>{course.modules.length}</strong><span>Módulos</span></div>
        <div><strong>{lessons.length}</strong><span>Aulas</span></div>
        <div><strong>{readyLessons}</strong><span>Vídeos prontos</span></div>
      </div>
    </section>

    <section className="learning-structure-head">
      <div><p className="eyebrow">ESTRUTURA</p><h2>Módulos e aulas</h2><p>As aulas são liberadas ao colaborador em sequência. Ele só avança após concluir a anterior.</p></div>
      <button className="primary-action action-with-icon" onClick={()=>setModuleOpen(true)}><FiPlus/> Adicionar módulo</button>
    </section>

    <section className="panel learning-progress-panel">
      <div className="panel-head">
        <div><p className="eyebrow">ACOMPANHAMENTO</p><h2>Progresso dos colaboradores</h2><p className="panel-description">Tempo validado pelo servidor, aulas concluídas e tentativas de avanço não aceitas.</p></div>
        <span className="trail-requirement-count">{progress.students.length}</span>
      </div>

      {progress.students.length?<div className="learning-progress-table">
        <div className="learning-progress-row head"><span>Colaborador</span><span>Progresso</span><span>Aulas</span><span>Tempo validado</span><span>Alertas</span><span>Última atividade</span></div>
        {progress.students.map(student=><div className="learning-progress-row" key={student.user.id}>
          <span><strong>{student.user.name}</strong><small>{student.user.email}</small></span>
          <span><div className="learning-progress-meter"><i style={{width:student.percentage+'%'}}/></div><b>{student.percentage}%</b></span>
          <span>{student.completedLessons}/{progress.totalLessons}</span>
          <span>{Math.floor(student.watchedSeconds/60)} min</span>
          <span><em className={student.suspiciousEvents?'learning-alert-count has-alert':'learning-alert-count'}>{student.suspiciousEvents}</em></span>
          <span>{new Date(student.updatedAt).toLocaleString('pt-BR')}</span>
        </div>)}
      </div>:<div className="empty-state compact"><b>Ninguém iniciou este curso ainda</b><span>O progresso aparecerá aqui assim que um colaborador começar a primeira aula.</span></div>}
    </section>

    <section className="learning-module-list">
      {course.modules.map((module,moduleIndex)=><article className="learning-module-card" key={module.id}>
        <div className="learning-module-head">
          <div className="learning-module-number">{String(moduleIndex+1).padStart(2,'0')}</div>
          <div className="learning-module-copy"><strong>{module.title}</strong><span>{module.description||'Sem descrição'}</span></div>
          <button className="secondary-button action-with-icon" onClick={()=>setLessonModule(module)}><FiPlus/> Aula</button>
        </div>

        <div className="learning-lesson-list">
          {module.lessons.map((lesson,lessonIndex)=><div className="learning-lesson-row" key={lesson.id}>
            <div className="learning-lesson-order">{moduleIndex+1}.{lessonIndex+1}</div>
            <div className={'learning-lesson-video-status '+lesson.videoStatus.toLowerCase()}>
              {lesson.videoStatus==='READY'?<FiCheck/>:lesson.videoStatus==='PROCESSING'?<FiRefreshCw/>:<FiVideo/>}
            </div>
            <div className="learning-lesson-copy">
              <strong>{lesson.title}</strong>
              <span>{lesson.description||'Sem descrição'}</span>
              {lesson.processingError&&<small className="learning-processing-error">{lesson.processingError}</small>}
            </div>
            <div className="learning-lesson-meta">
              <span><FiClock/>{formatDuration(lesson.durationSeconds)}</span>
              <span>{lesson.minCompletionPercent}% mínimo</span>
              <em>{lesson.videoStatus==='READY'?'Pronto':lesson.videoStatus==='PROCESSING'?'Processando':lesson.videoStatus==='ERROR'?'Erro no vídeo':'Sem vídeo'}</em>
            </div>
            <button className="secondary-button action-with-icon" onClick={()=>{setUploadLesson(lesson);setVideoFile(null)}}><FiUploadCloud/>{lesson.videoStatus==='READY'?'Substituir vídeo':'Enviar vídeo'}</button>
          </div>)}

          {!module.lessons.length&&<div className="learning-module-empty">Nenhuma aula neste módulo.</div>}
        </div>
      </article>)}

      {!course.modules.length&&<div className="empty-state"><b>Comece criando o primeiro módulo</b><span>Depois adicione as aulas na ordem em que o colaborador deve assistir.</span></div>}
    </section>

    {moduleOpen&&<div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><div><p className="eyebrow">NOVO MÓDULO</p><h2>Adicionar módulo</h2></div><button className="modal-close" onClick={()=>setModuleOpen(false)}><FiX/></button></div>
      <div className="form-grid">
        <label>Título<input value={moduleForm.title} onChange={e=>setModuleForm({...moduleForm,title:e.target.value})} placeholder="Ex.: Fundamentos"/></label>
        <label>Descrição<textarea value={moduleForm.description} onChange={e=>setModuleForm({...moduleForm,description:e.target.value})} placeholder="Objetivo deste módulo."/></label>
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setModuleOpen(false)}>Cancelar</button><button className="primary-action" disabled={saving||!moduleForm.title.trim()} onClick={createModule}>{saving?'Salvando...':'Adicionar módulo'}</button></div>
    </div></div>}

    {lessonModule&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">NOVA AULA</p><h2>{lessonModule.title}</h2><p>A aula será adicionada ao final deste módulo.</p></div><button className="modal-close" onClick={()=>setLessonModule(null)}><FiX/></button></div>
      <div className="form-grid two">
        <label className="span-2">Título<input value={lessonForm.title} onChange={e=>setLessonForm({...lessonForm,title:e.target.value})} placeholder="Ex.: Introdução ao controller"/></label>
        <label className="span-2">Descrição<textarea value={lessonForm.description} onChange={e=>setLessonForm({...lessonForm,description:e.target.value})} placeholder="Conteúdo abordado na aula."/></label>
        <label>Percentual mínimo para conclusão<input type="number" min={80} max={100} value={lessonForm.minCompletionPercent} onChange={e=>setLessonForm({...lessonForm,minCompletionPercent:Number(e.target.value)})}/><small className="field-help">Recomendado: 90%. O vídeo não pode ser avançado.</small></label>
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setLessonModule(null)}>Cancelar</button><button className="primary-action" disabled={saving||!lessonForm.title.trim()} onClick={createLesson}>{saving?'Salvando...':'Criar aula'}</button></div>
    </div></div>}

    {uploadLesson&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">VÍDEO DA AULA</p><h2>{uploadLesson.title}</h2><p>O vídeo será convertido para HLS. O processamento pode levar alguns minutos.</p></div><button className="modal-close" onClick={()=>setUploadLesson(null)}><FiX/></button></div>
      <label className="learning-video-upload">
        <FiUploadCloud/>
        <strong>{videoFile?videoFile.name:'Selecione o vídeo'}</strong>
        <span>MP4, MOV, WEBM e outros formatos compatíveis com FFmpeg.</span>
        <input type="file" accept="video/*" onChange={e=>setVideoFile(e.target.files?.[0]||null)}/>
      </label>
      <div className="submission-note"><strong>Processamento protegido</strong><span>A Trilha gera segmentos HLS e não publica o MP4 original. O servidor precisa ter FFmpeg e FFprobe instalados.</span></div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setUploadLesson(null)}>Cancelar</button><button className="primary-action action-with-icon" disabled={uploading||!videoFile} onClick={uploadVideo}><FiUploadCloud/>{uploading?'Enviando...':'Enviar e processar'}</button></div>
    </div></div>}
  </AppLayout>;
}
