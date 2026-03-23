const fs = require('fs');
const path = require('path');
const BASE='http://localhost:5002';
const LEON={email:'leon.mentor.buksu@gmail.com',password:'Password123!'};
const INSTRUCTOR={email:'2301103203@student.buksu.edu.ph',password:'Password123!'};
const STUDENT={email:'2501107801@student.buksu.edu.ph',password:'Password123!'};

function cookieFrom(res){const sc=typeof res.headers.getSetCookie==='function'?res.headers.getSetCookie():[res.headers.get('set-cookie')].filter(Boolean);return sc.map(c=>c.split(';')[0]).join('; ');}
async function login(creds){const r=await fetch(`${BASE}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(creds)});const t=await r.text();if(!r.ok) throw new Error(`login ${creds.email} ${r.status} ${t}`); return {status:r.status,cookie:cookieFrom(r)};}

(async()=>{
 const out=[];
 const leon=await login(LEON); const leonHeaders={Cookie:leon.cookie}; out.push(['S1-1 Leon auth',leon.status===200,`status=${leon.status}`]);
 const statsRes=await fetch(`${BASE}/api/dashboard/stats`,{headers:leonHeaders}); const stats=await statsRes.json(); const ghostId=stats?.data?.pendingReviews?.[0]?._id;
 out.push(['S1-2 Ghost submission lookup',Boolean(ghostId),`submissionId=${ghostId||'none'}`]);
 if(ghostId){ const r=await fetch(`${BASE}/api/submissions/${ghostId}/view`,{headers:leonHeaders}); const j=await r.json().catch(()=>({})); out.push(['S1-3 Ghost view endpoint status',r.status===404,`status=${r.status}`]); out.push(['S1-4 Ghost error code',j?.error?.code==='SUBMISSION_FILE_UNAVAILABLE',`code=${j?.error?.code||'none'}`]); }
 else { out.push(['S1-3 Ghost view endpoint status',false,'missing ghost id']); out.push(['S1-4 Ghost error code',false,'missing ghost id']); }
 const health=await fetch(`${BASE}/api/health`); out.push(['S1-5 App alive after ghost request',health.status===200,`health=${health.status}`]);

 const student=await login(STUDENT); const studentHeaders={Cookie:student.cookie}; out.push(['S2-1 Student auth',student.status===200,`status=${student.status}`]);
 const meRes=await fetch(`${BASE}/api/projects/me`,{headers:studentHeaders}); const me=await meRes.json(); const projectId=me?.data?.project?._id;
 out.push(['S2-2 Student project resolved',Boolean(projectId),`projectId=${projectId||'none'} status=${meRes.status}`]);
 const instructor=await login(INSTRUCTOR); const instructorHeaders={Cookie:instructor.cookie};
 if(projectId){ const appr=await fetch(`${BASE}/api/projects/${projectId}/title/approve`,{method:'POST',headers:instructorHeaders}); out.push(['S2-3 Instructor title approval pre-step',appr.status===200||appr.status===409,`status=${appr.status}`]);
   const p=path.join(process.cwd(),'tmp-happy-5002.txt'); fs.writeFileSync(p,'happy '+new Date().toISOString()); const fd=new FormData(); fd.append('chapter','1'); fd.append('remarks','test happy path after title approved'); fd.append('file',new Blob([fs.readFileSync(p)],{type:'text/plain'}),'tmp-happy-5002.txt');
   const up=await fetch(`${BASE}/api/submissions/${projectId}/chapters`,{method:'POST',headers:studentHeaders,body:fd}); const upText=await up.text(); let upJson={}; try{upJson=JSON.parse(upText)}catch{}
   const submissionId=upJson?.data?.submission?._id||null; out.push(['S2-4 Student upload new revision',up.status===201||up.status===200,`status=${up.status}`]); out.push(['S2-5 Uploaded submission id',Boolean(submissionId),`submissionId=${submissionId||'none'}`]);
   const leon2=await login(LEON); const leon2Headers={Cookie:leon2.cookie}; out.push(['S2-6 Leon re-auth',leon2.status===200,`status=${leon2.status}`]);
   if(submissionId){ const ws=await fetch(`${BASE}/api/submissions/${submissionId}/review-workspace`,{headers:leon2Headers}); out.push(['S2-7 Adviser workspace for new submission',ws.status===200,`status=${ws.status}`]); const view=await fetch(`${BASE}/api/submissions/${submissionId}/view`,{headers:leon2Headers}); const viewJson=await view.json().catch(()=>({})); const hasUrl=Boolean(viewJson?.data?.url); out.push(['S2-8 New submission view endpoint',view.status===200,`status=${view.status}`]); out.push(['S2-9 New submission has view URL',hasUrl,`hasUrl=${hasUrl}`]); }
   else { out.push(['S2-7 Adviser workspace for new submission',false,'missing submissionId']); out.push(['S2-8 New submission view endpoint',false,'missing submissionId']); out.push(['S2-9 New submission has view URL',false,'missing submissionId']); }
 }
 else { out.push(['S2-3 Instructor title approval pre-step',false,'project missing']); out.push(['S2-4 Student upload new revision',false,'project missing']); out.push(['S2-5 Uploaded submission id',false,'project missing']); out.push(['S2-6 Leon re-auth',false,'project missing']); out.push(['S2-7 Adviser workspace for new submission',false,'project missing']); out.push(['S2-8 New submission view endpoint',false,'project missing']); out.push(['S2-9 New submission has view URL',false,'project missing']); }

 const leon3=await login(LEON); const kpi=await fetch(`${BASE}/api/dashboard/instructor/kpis`,{headers:{Cookie:leon3.cookie}}); const kpiJson=await kpi.json().catch(()=>({})); out.push(['S3-1 Adviser blocked from instructor KPI',kpi.status===403,`status=${kpi.status}`]); out.push(['S3-2 RBAC error body present',Boolean(kpiJson?.error||kpiJson?.message),`bodyKeys=${Object.keys(kpiJson||{}).join(',')}`]);

 const pass=out.filter((x)=>x[1]).length; const fail=out.length-pass; console.log('=== LEON WORKFLOW TEST MATRIX (PORT 5002) ==='); out.forEach(([n,p,d])=>console.log(`${p?'PASS':'FAIL'} | ${n} | ${d}`)); console.log(`SUMMARY pass=${pass} fail=${fail} total=${out.length}`); process.exit(fail?2:0);
})().catch((e)=>{console.error('HARNESS_ERROR',e.message); process.exit(1);});
