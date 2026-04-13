import sys

with open('client/src/pages/projects/ProjectDetailPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_peer_pdf = "import ReadonlyPDFViewer from '@/components/projects/ReadonlyPDFViewer';\n"
if "ReadonlyPDFViewer" not in content:
    content = content.replace("import ChapterProgressWithRounds", import_peer_pdf + "import ChapterProgressWithRounds")

old_def = """  const { data: chapterSubmissions } = useProjectSubmissions(
    project?._id,
    { limit: 200, type: 'chapter' },
    { enabled: !!project?._id },
  );

  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const isArchived =
    Boolean(project?.isArchived) || project?.projectStatus === PROJECT_STATUSES.ARCHIVED;"""

new_def = """  const isStudent = user?.role === ROLES.STUDENT;
  const projectTeamId = project?.teamId?._id || project?.teamId;
  const userTeamId = user?.teamId?._id || user?.teamId;
  const isAuthor = isStudent && userTeamId && projectTeamId && userTeamId === projectTeamId;
  const isOwnerOrAdmin = !isStudent || isAuthor;
  const isPeer = isStudent && !isAuthor;

  const { data: chapterSubmissions } = useProjectSubmissions(
    project?._id,
    { limit: 200, type: 'chapter' },
    { enabled: !!project?._id && isOwnerOrAdmin },
  );

  const { data: finalAcademicData } = useProjectSubmissions(
    project?._id,
    { limit: 1, type: 'final_academic' },
    { enabled: !!project?._id && isPeer },
  );

  const finalManuscriptUrl = finalAcademicData?.[0]?.fileUrl || finalAcademicData?.submissions?.[0]?.fileUrl;

  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const isArchived =
    Boolean(project?.isArchived) || project?.projectStatus === PROJECT_STATUSES.ARCHIVED;"""

content = content.replace(old_def, new_def)

old_body = """            {/* History tab with audit trail */}
            <ProjectHistoryCard projectId={project._id} />

            {!isArchived && <TitleProposalsSection project={project} />}

            {/* Chapter progress + rounds (faculty visibility) */}
            <ChapterProgressWithRounds
              project={project}
              submissions={chapterSubmissions}
              chapters={[1, 2, 3, 4, 5]}
              title="Chapter Progress & Rounds"
              description="Per chapter status with round tabs including adviser review comments, document, and date."
              showUploadButton={false}
              showAllSubmissionsButton={false}
            />"""

new_body_better = """            {isPeer && (
              <ReadonlyPDFViewer 
                fileUrl={finalManuscriptUrl} 
                title="Approved Manuscript"
              />
            )}
            
            {!isPeer && (
              <>
                {/* History tab with audit trail */}
                <ProjectHistoryCard projectId={project._id} />

                {!isArchived && <TitleProposalsSection project={project} />}

                {/* Chapter progress + rounds (faculty visibility) */}
                <ChapterProgressWithRounds
                  project={project}
                  submissions={chapterSubmissions}
                  chapters={[1, 2, 3, 4, 5]}
                  title="Chapter Progress & Rounds"
                  description="Per chapter status with round tabs including adviser review comments, document, and date."
                  showUploadButton={false}
                  showAllSubmissionsButton={false}
                />"""

content = content.replace(old_body, new_body_better)

old_end = """            {/* Reject project — instructor only */}
            {!isArchived && isInstructor && project.projectStatus !== PROJECT_STATUSES.REJECTED && (
              <RejectProjectCard project={project} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}"""

new_end = """            {/* Reject project — instructor only */}
            {!isArchived && isInstructor && project.projectStatus !== PROJECT_STATUSES.REJECTED && (
              <RejectProjectCard project={project} />
            )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}"""

content = content.replace(old_end, new_end)

with open('client/src/pages/projects/ProjectDetailPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated ProjectDetailPage.jsx')
