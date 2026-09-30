'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import {
  FiBookOpen,
  FiChevronRight,
  FiClock,
  FiDownloadCloud,
  FiPlus,
  FiSearch,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type QualificationLink={id?:string;title:string;url:string;order?:number};

type Qualification={
  id:string;
  name:string;
  type:string;
  description?:string|null;
  active:boolean;
  team?:{id:string;name:string}|null;
  links?:QualificationLink[];
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
  const [importingId,setImportingId]=useState('');
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

  const courseQualifications=useMemo(
    ()=>qualifications.filter(item=>item.type==='COURSE'&&item.active),
    [qualifications]
  );

  const linkedQualificationIds=useMemo(
    ()=>new Set(courses.map(course=>course.qualification?.id).filter(Boolean) as string[]),
    [courses]
  );

  const availableQualifications=useMemo(
    ()=>courseQualifications.filter(item=>!linkedQualificationIds.has(item.id)),
    [courseQualifications,linkedQualificationIds]
  );

  const filteredCourses=useMemo(()=>{
    const search=query.trim().toLowerCase();
    if(!search)return courses;
    return courses.filter(course=>[
      course.title,
      course.description,
      course.qualification?.name,
      course.qualification?.team?.name,
    ].some(value=>value?.toLowerCase().includes(search)));
  },[courses,query]);

  const filteredAvailable=useMemo(()=>{
    const search=query.trim().toLowerCase();
    if(!search)return availableQualifications;
    return availableQualifications.filter(item=>[
      item.name,
      item.description,
      item.team?.name,
      ...(item.links||[]).map(link=>link.title),
    ].some(value=>value?.toLowerCase().includes(search)));
  },[availableQualifications,query]);

  function openCreate(qualification?:Qualification){
    setForm({
      title:qualification?.name||'',
      description:qualification?.description||'',
      qualificationId:qualification?.id||'',
    });
    setOpen(true);
  }

  function selectQualification(qualificationId:string){
    const qualification=availableQualifications.find(item=>item.id===qualificationId);
    setForm(current=>({
      ...current,
      qualificationId,
      title:qualification?.name||current.title,
      description:qualification?.description||current.description,
    }));
  }

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

  async function importQualification(qualification:Qualification){
    setImportingId(qualification.id);
    setError('');
    try{
      await api('/learning/courses',{
        method:'POST',
        body:JSON.stringify({
          title:qualification.name,
          description:qualification.description||undefined,
          qualificationId:qualification.id,
        }),
      });
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao importar curso da qualificação');
    }finally{
      setImportingId('');
    }
  }

  return <AppLayout
    title="Cursos"
    description="Os cursos cadastrados nas qualificações aparecem aqui e podem ser transformados em treinamentos internos."
    action={<button className="primary-action action-with-icon" onClick={()=>openCreate()}><FiPlus/> Configurar curso</button>}
  >
    {error&&<div className="form-error">{error}</div>}

    <section className="learning-admin-toolbar">
      <label className="search-field"><FiSearch/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar curso ou qualificação..."/></label>
      <span>{courseQualifications.length} curso(s) nas qualificações · {courses.length} configurado(s)</span>
    </section>

    {filteredAvailable.length>0&&<section className="learning-qualified-courses">
      <div className="learning-qualified-head">
        <div>
          <p className="eyebrow">CURSOS DAS QUALIFICAÇÕES</p>
          <h2>Prontos para configurar</h2>
          <p>Esses cursos já existem como qualificações e ainda não possuem módulos e aulas internas.</p>
        </div>
        <span>{filteredAvailable.length} disponível(is)</span>
      </div>

      <div className="learning-qualified-grid">
        {filteredAvailable.map(qualification=><article className="learning-qualified-card" key={qualification.id}>
          <div className="learning-qualified-icon"><FiDownloadCloud/></div>
          <div className="learning-qualified-copy">
            <div className="learning-qualified-title">
              <div>
                <strong>{qualification.name}</strong>
                <span>{qualification.team?.name||'Sem time'}</span>
              </div>
              <em className="status-pill muted">Qualificação</em>
            </div>
            <p>{qualification.description||'Sem descrição cadastrada.'}</p>
            {!!qualification.links?.length&&<small>{qualification.links.length} material(is) de referência cadastrado(s)</small>}
          </div>
          <div className="learning-qualified-actions">
            <button className="secondary-button" onClick={()=>openCreate(qualification)}>Revisar</button>
            <button className="primary-action action-with-icon" disabled={importingId===qualification.id} onClick={()=>void importQualification(qualification)}>
              <FiDownloadCloud/>{importingId===qualification.id?'Importando...':'Usar como curso'}
            </button>
          </div>
        </article>)}
      </div>
    </section>}

    <section className="learning-configured-section">
      <div className="learning-qualified-head">
        <div>
          <p className="eyebrow">TREINAMENTOS INTERNOS</p>
          <h2>Cursos configurados</h2>
          <p>Gerencie módulos, aulas, vídeos e acompanhe o progresso dos colaboradores.</p>
        </div>
      </div>

      <section className="learning-course-grid">
        {filteredCourses.map(course=>{
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

      {!filteredCourses.length&&<div className="empty-state compact"><b>Nenhum treinamento interno configurado</b><span>Use um dos cursos cadastrados nas qualificações acima para começar.</span></div>}
    </section>

    {open&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head">
        <div><p className="eyebrow">APRENDIZADO INTERNO</p><h2>Configurar curso</h2><p>Selecione uma qualificação do tipo Curso. Nome e descrição são puxados automaticamente e podem ser ajustados para o treinamento interno.</p></div>
        <button className="modal-close" onClick={()=>setOpen(false)} aria-label="Fechar"><FiX/></button>
      </div>

      <div className="form-grid two">
        <label className="span-2">Curso cadastrado na qualificação<select value={form.qualificationId} onChange={e=>selectQualification(e.target.value)}><option value="">Selecione...</option>{availableQualifications.map(item=><option key={item.id} value={item.id}>{item.team?.name?item.team.name+' · ':''}{item.name}</option>)}</select></label>
        <label className="span-2">Título<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Nome do treinamento"/></label>
        <label className="span-2">Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Objetivo deste treinamento."/></label>
      </div>

      {!availableQualifications.length&&<div className="submission-note"><strong>Nenhuma qualificação de curso disponível</strong><span>Todos os cursos cadastrados nas qualificações já estão configurados ou ainda é necessário criar uma qualificação do tipo Curso.</span></div>}

      <div className="modal-actions">
        <button className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button>
        <button className="primary-action" disabled={saving||!form.title.trim()||!form.qualificationId} onClick={createCourse}>{saving?'Criando...':'Criar treinamento'}</button>
      </div>
    </div></div>}
  </AppLayout>;
}
