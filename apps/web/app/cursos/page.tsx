'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { FiBookOpen,FiChevronRight,FiClock,FiPlus,FiSearch,FiVideo,FiX } from 'react-icons/fi';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Qualification={
  id:string;
  name:string;
  type:string;
  active:boolean;
  team?:{id:string;name:string}|null;
};

type Course={
  id:string;
  title:string;
  description?:string|null;
  active:boolean;
  qualification?:{id:string;name:string;team?:{id:string;name:string}|null}|null;
  modules:{
    id:string;
    lessons:{
      id:string;
      videoStatus:string;
      durationSeconds?:number|null;
    }[];
  }[];
};

function durationLabel(seconds:number){
  const hours=Math.floor(seconds/3600);
  const minutes=Math.floor((seconds%3600)/60);
  if(hours)return hours+'h '+minutes+'min';
  return minutes+'min';
}

export default function Cursos(){
  const [courses,setCourses]=useState<Course[]>([]);
  const [qualifications,setQualifications]=useState<Qualification[]>([]);
  const [query,setQuery]=useState('');
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [form,setForm]=useState({title:'',description:'',qualificationId:''});

  async function load(){
    try{
      const [courseList,qualificationList]=await Promise.all([
        api<Course[]>('/learning/courses'),
        api<Qualification[]>('/qualifications'),
      ]);
      setCourses(courseList);
      setQualifications(qualificationList);
      setError('');
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao carregar cursos');
    }
  }

  useEffect(()=>{void load()},[]);

  const linkedQualificationIds=new Set(courses.map(course=>course.qualification?.id).filter(Boolean));
  const availableQualifications=qualifications.filter(item=>
    item.type==='COURSE'&&item.active&&!linkedQualificationIds.has(item.id)
  );

  const filtered=useMemo(()=>{
    const search=query.trim().toLowerCase();
    if(!search)return courses;
    return courses.filter(course=>[
      course.title,
      course.description,
      course.qualification?.name,
      course.qualification?.team?.name,
    ].some(value=>value?.toLowerCase().includes(search)));
  },[courses,query]);

  async function createCourse(){
    setSaving(true);
    setError('');
    try{
      await api('/learning/courses',{
        method:'POST',
        body:JSON.stringify({
          title:form.title,
          description:form.description||undefined,
          qualificationId:form.qualificationId,
        }),
      });
      setForm({title:'',description:'',qualificationId:''});
      setOpen(false);
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao criar curso');
    }finally{
      setSaving(false);
    }
  }

  return <AppLayout
    title="Cursos"
    description="Crie treinamentos internos, organize módulos e acompanhe os vídeos vinculados às qualificações."
    action={<button className="primary-action action-with-icon" onClick={()=>setOpen(true)}><FiPlus/> Novo curso</button>}
  >
    {error&&<div className="form-error">{error}</div>}

    <section className="learning-admin-toolbar">
      <label className="search-field"><FiSearch/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar curso..."/></label>
      <span>{courses.length} curso(s) cadastrado(s)</span>
    </section>

    <section className="learning-course-grid">
      {filtered.map(course=>{
        const lessons=course.modules.flatMap(module=>module.lessons);
        const ready=lessons.filter(lesson=>lesson.videoStatus==='READY').length;
        const processing=lessons.filter(lesson=>lesson.videoStatus==='PROCESSING').length;
        const seconds=lessons.reduce((sum,lesson)=>sum+(lesson.durationSeconds||0),0);

        return <Link href={'/cursos/'+course.id} className="learning-course-admin-card" key={course.id}>
          <div className="learning-course-admin-icon"><FiBookOpen/></div>
          <div className="learning-course-admin-main">
            <div className="learning-course-admin-title">
              <div><strong>{course.title}</strong><span>{course.qualification?.team?.name||'Sem time'} · {course.qualification?.name||'Sem qualificação'}</span></div>
              <em className={course.active?'status-pill':'status-pill muted'}>{course.active?'Ativo':'Inativo'}</em>
            </div>
            <p>{course.description||'Sem descrição cadastrada.'}</p>
            <div className="learning-course-admin-metrics">
              <span><FiVideo/>{lessons.length} aula(s)</span>
              <span><FiClock/>{seconds?durationLabel(seconds):'Sem duração'}</span>
              <span>{ready} vídeo(s) pronto(s)</span>
              {processing>0&&<span className="processing">{processing} processando</span>}
            </div>
          </div>
          <FiChevronRight className="learning-course-admin-arrow"/>
        </Link>;
      })}
    </section>

    {!filtered.length&&<div className="empty-state"><b>Nenhum curso encontrado</b><span>Crie um curso e vincule-o a uma qualificação do tipo Curso.</span></div>}

    {open&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head">
        <div><p className="eyebrow">APRENDIZADO INTERNO</p><h2>Novo curso</h2><p>O curso será concluído automaticamente quando todas as aulas forem assistidas.</p></div>
        <button className="modal-close" onClick={()=>setOpen(false)} aria-label="Fechar"><FiX/></button>
      </div>

      <div className="form-grid two">
        <label className="span-2">Título<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ex.: Fundamentos de redes UniFi"/></label>
        <label className="span-2">Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Explique o objetivo deste treinamento."/></label>
        <label className="span-2">Qualificação<select value={form.qualificationId} onChange={e=>setForm({...form,qualificationId:e.target.value})}><option value="">Selecione uma qualificação do tipo Curso...</option>{availableQualifications.map(item=><option key={item.id} value={item.id}>{item.team?.name?item.team.name+' · ':''}{item.name}</option>)}</select></label>
      </div>

      {!availableQualifications.length&&<div className="submission-note"><strong>Nenhuma qualificação disponível</strong><span>Crie uma qualificação do tipo Curso antes de cadastrar outro curso interno.</span></div>}

      <div className="modal-actions">
        <button className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button>
        <button className="primary-action" disabled={saving||!form.title.trim()||!form.qualificationId} onClick={createCourse}>{saving?'Criando...':'Criar curso'}</button>
      </div>
    </div></div>}
  </AppLayout>;
}
