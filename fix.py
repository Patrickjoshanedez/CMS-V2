import re

with open('tests/integration/dashboard.test.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("import { createAuthenticatedUserWithRole, createAuthenticatedAgent } from '../helpers.js';", "import { createAuthenticatedUserWithRole, createAuthenticatedAgent, createCourseAndSection, createValidProjectPayload } from '../helpers.js';")

pattern = r"const project = await Project.create\(\{(.*?)\}\);"
def repl1(m):
    return "const { course, section } = await createCourseAndSection(user._id);\n      const payload = createValidProjectPayload(team._id, course._id, section._id, [user._id]);\n      payload.title = 'Dashboard Test Project Title';\n      payload.capstonePhase = 1;\n      const project = await Project.create(payload);"
text = re.sub(r"const project = await Project.create\(\{.*?title: 'Dashboard Test Project Title',.*?\}\);", repl1, text, flags=re.DOTALL)

pattern2 = r"await Project.create\(\{.*?title: 'Seed Project For Instructor Stats',.*?\}\);"
def repl2(m):
    return "const { course, section } = await createCourseAndSection(instructor._id);\n      const payload = createValidProjectPayload(team._id, course._id, section._id, [instructor._id]);\n      payload.title = 'Seed Project For Instructor Stats';\n      payload.projectStatus = 'active';\n      await Project.create(payload);"
text = re.sub(pattern2, repl2, text, flags=re.DOTALL)

pattern3 = r"const project = await Project.create\(\{.*?title: 'Adviser Assigned Project Title',.*?\}\);"
def repl3(m):
    return "const { course, section } = await createCourseAndSection(adviser._id);\n      const payload = createValidProjectPayload(team._id, course._id, section._id, [adviser._id]);\n      payload.title = 'Adviser Assigned Project Title';\n      payload.adviserId = adviser._id;\n      const project = await Project.create(payload);"
text = re.sub(pattern3, repl3, text, flags=re.DOTALL)

pattern4 = r"await Project.create\(\{.*?title: 'Panelist Review Project Title',.*?\}\);"
def repl4(m):
    return "const { course, section } = await createCourseAndSection(panelist._id);\n      const payload = createValidProjectPayload(team._id, course._id, section._id, [panelist._id]);\n      payload.title = 'Panelist Review Project Title';\n      payload.panelistIds = [panelist._id];\n      await Project.create(payload);"
text = re.sub(pattern4, repl4, text, flags=re.DOTALL)

with open('tests/integration/dashboard.test.js', 'w', encoding='utf-8') as f:
    f.write(text)

