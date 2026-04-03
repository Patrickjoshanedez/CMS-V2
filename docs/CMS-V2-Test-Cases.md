# CMS-V2 Comprehensive Test Execution Report

**Document Version:** 1.0  
**Total Test Cases:** 120  
**System Under Test:** Capstone Management System V2  
**Date Created:** 2026-04-02

---

## TEST CASE FORMAT

| Column | Description |
|--------|-------------|
| Test Case # | Unique identifier (TC-[Module]-[Number]) |
| Test Case Description | Brief description of the test |
| Test Steps | Step-by-step instructions |
| Test Data | Input data required |
| Expected Result | What should happen |
| Actual Result | What actually happened (to be filled during execution) |
| Pass/Fail | Execution status |
| Remarks | Additional notes |

---

## MODULE 1: AUTHENTICATION (TC-AUTH-001 to TC-AUTH-015)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-AUTH-001 | Register with valid data | 1. Open Register page. 2. Enter valid email, password, name. 3. Select course & section. 4. Click "Create Account". | Email: test.user@buksu.edu.ph; Password: Test@12345; Name: Juan Dela Cruz; Course: BSIT; Section: 4A | Account created. OTP sent to email. Redirect to OTP verification page. | Pending | Pending | Validate email format and password strength |
| TC-AUTH-002 | Register with invalid email format | 1. Open Register page. 2. Enter invalid email. 3. Submit form. | Email: invalid-email; Password: Test@12345 | Error message: "Invalid email format" | Pending | Pending | Frontend + backend validation |
| TC-AUTH-003 | Register with weak password | 1. Open Register page. 2. Enter weak password. 3. Submit form. | Email: test@buksu.edu.ph; Password: 123 | Error: "Password must be at least 8 characters with uppercase, number, special char" | Pending | Pending | Check password strength meter |
| TC-AUTH-004 | Register with existing email | 1. Open Register page. 2. Enter already registered email. 3. Submit form. | Email: existing@buksu.edu.ph; Password: Test@12345 | Error: "Email already registered" | Pending | Pending | Prevent duplicate accounts |
| TC-AUTH-005 | Verify OTP with valid code | 1. Register new account. 2. Check email for OTP. 3. Enter 6-digit code. 4. Click "Verify". | OTP: valid 6-digit code from email | Verification succeeds. User can proceed to login. | Pending | Pending | OTP should expire in 5 mins |
| TC-AUTH-006 | Verify OTP with invalid code | 1. Register new account. 2. Enter wrong OTP. 3. Click "Verify". | OTP: 000000 (invalid) | Error: "Invalid or expired verification code" | Pending | Pending | Max 5 attempts before lockout |
| TC-AUTH-007 | Resend OTP code | 1. Register new account. 2. Click "Resend Code". 3. Check email. | Email: registered email | New OTP sent. Previous OTP invalidated. Confirmation shown. | Pending | Pending | Rate limit: 1 per minute |
| TC-AUTH-008 | Login with valid credentials | 1. Open Login page. 2. Enter valid email/password. 3. Click "Sign In". | Email: verified@buksu.edu.ph; Password: Test@12345 | Login successful. Redirect to dashboard. JWT tokens issued. | Pending | Pending | Check token in cookies |
| TC-AUTH-009 | Login with invalid credentials | 1. Open Login page. 2. Enter wrong password. 3. Click "Sign In". | Email: verified@buksu.edu.ph; Password: WrongPass123 | Error: "Invalid email or password" | Pending | Pending | Generic error for security |
| TC-AUTH-010 | Login with unverified email | 1. Register but don't verify. 2. Try to login. | Email: unverified@buksu.edu.ph; Password: Test@12345 | Error: "Please verify your email first". Redirect to OTP page. | Pending | Pending | Force email verification |
| TC-AUTH-011 | Forgot password request | 1. Open Login page. 2. Click "Forgot Password". 3. Enter registered email. 4. Submit. | Email: verified@buksu.edu.ph | OTP sent to email. Confirmation message shown. | Pending | Pending | Rate limited endpoint |
| TC-AUTH-012 | Reset password with valid OTP | 1. Request password reset. 2. Enter OTP from email. 3. Enter new password. 4. Submit. | OTP: valid; New Password: NewPass@123 | Password updated. Can login with new password. | Pending | Pending | Old password invalidated |
| TC-AUTH-013 | Reset password with expired OTP | 1. Request password reset. 2. Wait 10 minutes. 3. Enter expired OTP. | OTP: expired code | Error: "OTP expired. Please request a new one." | Pending | Pending | OTP expires in 5 mins |
| TC-AUTH-014 | Logout user | 1. Login successfully. 2. Click profile menu. 3. Click "Logout". | N/A | Session cleared. Tokens invalidated. Redirect to login page. | Pending | Pending | Clear cookies/localStorage |
| TC-AUTH-015 | Change password while logged in | 1. Login. 2. Go to Settings. 3. Enter current + new password. 4. Submit. | Current: Test@12345; New: NewPass@456 | Password changed. Forced re-login with new password. | Pending | Pending | Validate current password first |

---

## MODULE 2: USER MANAGEMENT (TC-USER-001 to TC-USER-012)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-USER-001 | View own profile | 1. Login as any user. 2. Click profile icon. 3. View profile page. | N/A | Profile displayed with name, email, department, section, avatar. | Pending | Pending | All users can view own profile |
| TC-USER-002 | Update own profile | 1. Login. 2. Go to Profile. 3. Edit name/department. 4. Save changes. | Name: Updated Name; Department: Computer Science | Profile updated. Changes reflected immediately. | Pending | Pending | Cannot change email |
| TC-USER-003 | Upload avatar image | 1. Login. 2. Go to Profile. 3. Click avatar upload. 4. Select valid image. 5. Confirm. | Image: profile.jpg (< 5MB, JPG/PNG) | Avatar uploaded. New image displayed. | Pending | Pending | Validate file type & size |
| TC-USER-004 | Upload invalid avatar (too large) | 1. Login. 2. Go to Profile. 3. Upload 10MB image. | Image: large-image.jpg (10MB) | Error: "File size must be under 5MB" | Pending | Pending | Size validation |
| TC-USER-005 | Instructor lists all users | 1. Login as Instructor. 2. Navigate to Users page. 3. View list. | N/A | All users listed with pagination. Shows name, email, role, status. | Pending | Pending | Instructor only |
| TC-USER-006 | Instructor creates new user | 1. Login as Instructor. 2. Go to Users. 3. Click "Add User". 4. Fill details. 5. Save. | Name: New Faculty; Email: faculty@buksu.edu.ph; Role: Adviser | User created. Appears in list. Welcome email sent. | Pending | Pending | Pre-verified account |
| TC-USER-007 | Instructor changes user role | 1. Login as Instructor. 2. Go to Users. 3. Select user. 4. Change role to Panelist. 5. Save. | User: John Doe; New Role: Panelist | Role updated. User permissions changed immediately. | Pending | Pending | Audit log created |
| TC-USER-008 | Instructor deactivates user | 1. Login as Instructor. 2. Go to Users. 3. Select user. 4. Click "Deactivate". 5. Confirm. | User: Inactive User | User deactivated. Cannot login. Marked as inactive in list. | Pending | Pending | Soft delete |
| TC-USER-009 | Student cannot access Users page | 1. Login as Student. 2. Navigate to /admin/users URL. | N/A | Access denied. Redirect to Forbidden page (403). | Pending | Pending | Role-based access |
| TC-USER-010 | Filter users by role | 1. Login as Instructor. 2. Go to Users. 3. Select filter: "Adviser". | Filter: Role = Adviser | Only Advisers displayed in list. | Pending | Pending | Pagination maintained |
| TC-USER-011 | Search users by name | 1. Login as Instructor. 2. Go to Users. 3. Type name in search box. | Search: "Juan" | Users matching "Juan" displayed. | Pending | Pending | Case-insensitive search |
| TC-USER-012 | Adviser views list of instructors | 1. Login as Adviser. 2. Call GET /api/users/instructors. | N/A | List of instructors returned (for dropdown selection). | Pending | Pending | Limited endpoint access |

---

## MODULE 3: PROJECT MANAGEMENT (TC-PROJ-001 to TC-PROJ-020)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-PROJ-001 | Create new project | 1. Login as Team Leader. 2. Navigate to Projects. 3. Click "Create Project". 4. Enter title, abstract, keywords. 5. Save as draft. | Title: AI-Based Attendance System; Abstract: 200 words; Keywords: AI, Attendance | Project created in draft status. Appears in My Project page. | Pending | Pending | Only team leaders |
| TC-PROJ-002 | Check title similarity | 1. Create project. 2. Enter title similar to existing. 3. View similarity score. | Title: "Attendance Monitoring System" (similar to existing) | Similarity percentage displayed. Warning if >70%. | Pending | Pending | Real-time check |
| TC-PROJ-003 | Submit project title for approval | 1. Login as Team Leader. 2. Go to My Project. 3. Click "Submit Title". 4. Confirm. | Project: Draft status project | Status changes to "Submitted". Instructor notified. | Pending | Pending | Cannot edit after submit |
| TC-PROJ-004 | Instructor approves project title | 1. Login as Instructor. 2. Go to Projects. 3. Select pending project. 4. Click "Approve". | Project: Submitted status | Status changes to "Approved". Team notified. | Pending | Pending | Enables chapter uploads |
| TC-PROJ-005 | Instructor rejects project title | 1. Login as Instructor. 2. Select pending project. 3. Click "Reject". 4. Enter reason. | Project: Submitted; Reason: "Title too vague" | Status: "Revision Required". Team notified with reason. | Pending | Pending | Team can revise & resubmit |
| TC-PROJ-006 | Student revises rejected title | 1. Login as Team Leader. 2. Go to rejected project. 3. Edit title/abstract. 4. Click "Resubmit". | Updated Title: "AI-Based Classroom Attendance Using Face Recognition" | Status changes back to "Submitted". Instructor notified. | Pending | Pending | Revision counter incremented |
| TC-PROJ-007 | Request title modification after approval | 1. Login as Team Leader. 2. Go to approved project. 3. Click "Request Title Change". 4. Enter new title + reason. | New Title: "Updated Project Title"; Reason: "Scope change" | Modification request created. Status: "Modification Pending". | Pending | Pending | Requires instructor approval |
| TC-PROJ-008 | Instructor resolves title modification | 1. Login as Instructor. 2. View modification request. 3. Approve/Deny. | Action: Approve | If approved: Title updated. If denied: Original maintained. | Pending | Pending | Audit logged |
| TC-PROJ-009 | Assign adviser to project | 1. Login as Instructor. 2. Go to approved project. 3. Click "Assign Adviser". 4. Select adviser. | Adviser: Dr. Smith | Adviser assigned. Adviser receives notification. Appears in dashboard. | Pending | Pending | One adviser per project |
| TC-PROJ-010 | Assign panelist to project | 1. Login as Instructor. 2. Go to project. 3. Click "Assign Panelist". 4. Select panelist. | Panelist: Prof. Johnson | Panelist added to project panel. | Pending | Pending | Max 3 panelists |
| TC-PROJ-011 | Remove panelist from project | 1. Login as Instructor. 2. Go to project. 3. Click "Remove" on panelist. 4. Confirm. | Panelist: Prof. Johnson | Panelist removed from project. Panelist notified. | Pending | Pending | Audit logged |
| TC-PROJ-012 | Panelist self-selects into project | 1. Login as Panelist. 2. Go to Dashboard > Topics. 3. Click "Select" on available project. | Project: Available project within limit | Panelist added to project panel. | Pending | Pending | Respects max panel size |
| TC-PROJ-013 | Set chapter deadlines | 1. Login as Instructor. 2. Go to project. 3. Click "Set Deadlines". 4. Enter dates for each chapter. | Chapter 1: 2026-05-01; Chapter 2: 2026-05-15; etc. | Deadlines saved. Team sees deadlines in project view. | Pending | Pending | Deadline notifications sent |
| TC-PROJ-014 | Advance project phase | 1. Login as Instructor. 2. Go to project in Capstone 1. 3. Click "Advance Phase". | Project: Capstone 1 complete | Phase changes from 1 → 2. New requirements unlocked. | Pending | Pending | Phases: 1, 2, 3, 4 |
| TC-PROJ-015 | Archive completed project | 1. Login as Instructor. 2. Go to completed project. 3. Click "Archive". 4. Confirm. | Project: Capstone 4 complete | Project archived. Appears in archive search. | Pending | Pending | Requires all submissions complete |
| TC-PROJ-016 | Upload completion certificate | 1. Login as Instructor. 2. Go to archived project. 3. Click "Upload Certificate". 4. Select PDF. | Certificate: completion-cert.pdf | Certificate uploaded. Download link available. | Pending | Pending | PDF only |
| TC-PROJ-017 | Download completion certificate | 1. Login as Team Member. 2. Go to archived project. 3. Click "Download Certificate". | N/A | Certificate PDF downloaded. | Pending | Pending | Signed URL generated |
| TC-PROJ-018 | Add prototype link | 1. Login as Team Leader. 2. Go to project (Capstone 2+). 3. Click "Add Prototype". 4. Enter URL. | URL: https://github.com/team/project | Prototype link saved. Displayed in project prototypes. | Pending | Pending | Capstone 2/3 only |
| TC-PROJ-019 | Upload prototype media | 1. Login as Team Leader. 2. Go to project. 3. Click "Upload Media". 4. Select image/video. | Media: demo-video.mp4 (< 50MB) | Media uploaded. Thumbnail displayed in prototypes. | Pending | Pending | Image/video validation |
| TC-PROJ-020 | View project details | 1. Login as any user. 2. Navigate to specific project. | Project ID: valid project | Project details displayed: title, abstract, team, adviser, status, submissions. | Pending | Pending | Role-based field visibility |

---

## MODULE 4: TEAM MANAGEMENT (TC-TEAM-001 to TC-TEAM-010)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-TEAM-001 | Create new team | 1. Login as Student (no team). 2. Go to Teams. 3. Click "Create Team". 4. Enter team name. 5. Save. | Team Name: Code Wizards | Team created. Student becomes Team Leader. | Pending | Pending | Student can only be in 1 team |
| TC-TEAM-002 | Invite member to team | 1. Login as Team Leader. 2. Go to team page. 3. Click "Invite Member". 4. Select student. 5. Send invite. | Invitee: student@buksu.edu.ph | Invite sent. Pending status shown. Invitee notified. | Pending | Pending | Max 5 members per team |
| TC-TEAM-003 | Accept team invite | 1. Login as invited student. 2. Check notifications. 3. Click invite notification. 4. Click "Accept". | Invite Token: valid token | Student joins team. Removed from invite list. | Pending | Pending | Token-based accept |
| TC-TEAM-004 | Decline team invite | 1. Login as invited student. 2. Click invite notification. 3. Click "Decline". | Invite Token: valid token | Invite declined. Team Leader notified. | Pending | Pending | Invitee can be re-invited |
| TC-TEAM-005 | Assign member role | 1. Login as Team Leader. 2. Go to team page. 3. Select member. 4. Change role to "Secretary". 5. Save. | Member: John; New Role: Secretary | Role updated. Displayed in team roster. | Pending | Pending | Roles: Leader, Member, Secretary |
| TC-TEAM-006 | Transfer team leadership | 1. Login as Team Leader. 2. Go to team page. 3. Select member. 4. Click "Make Leader". | New Leader: Jane Doe | Leadership transferred. Old leader becomes Member. | Pending | Pending | Only 1 leader allowed |
| TC-TEAM-007 | Update Google Doc link | 1. Login as Team Leader. 2. Go to team page. 3. Enter Google Doc URL. 4. Save. | URL: https://docs.google.com/document/d/xxx | Link saved. Shared with team members. | Pending | Pending | Validates Google Docs URL |
| TC-TEAM-008 | View team as faculty | 1. Login as Instructor. 2. Go to Teams page. 3. View team list. | N/A | All teams listed with member count, project status. | Pending | Pending | Faculty view |
| TC-TEAM-009 | List invite candidates | 1. Login as Team Leader. 2. Go to invite page. 3. View eligible students. | N/A | Students without team in same course/section shown. | Pending | Pending | Filtered by course/section |
| TC-TEAM-010 | Prevent joining multiple teams | 1. Login as student already in team. 2. Try to accept another invite. | Existing Team: Yes | Error: "You are already a member of a team". | Pending | Pending | One team per student |

---

## MODULE 5: SUBMISSION MANAGEMENT (TC-SUB-001 to TC-SUB-018)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-SUB-001 | Upload Chapter 1 | 1. Login as Team Leader. 2. Go to Submissions. 3. Click "Upload Chapter 1". 4. Select PDF. 5. Submit. | File: chapter1.pdf (< 25MB) | Chapter uploaded. Status: "Pending Review". Adviser notified. | Pending | Pending | PDF only, size limit |
| TC-SUB-002 | Upload Chapter 2 | 1. Login as Team Leader. 2. Go to Submissions. 3. Click "Upload Chapter 2". 4. Select PDF. 5. Submit. | File: chapter2.pdf | Chapter uploaded. Version 1 created. | Pending | Pending | Sequential chapters |
| TC-SUB-003 | Upload Chapter 3 | 1. Login as Team Leader. 2. Go to Submissions. 3. Click "Upload Chapter 3". 4. Select PDF. 5. Submit. | File: chapter3.pdf | Chapter uploaded. | Pending | Pending | Chapter 3 = Methodology |
| TC-SUB-004 | Upload Chapter 4 | 1. Login as Team Leader. 2. Go to Submissions. 3. Upload Chapter 4. | File: chapter4.pdf | Chapter uploaded. | Pending | Pending | Chapter 4 = Results |
| TC-SUB-005 | Upload Chapter 5 | 1. Login as Team Leader. 2. Upload Chapter 5. | File: chapter5.pdf | Chapter uploaded. | Pending | Pending | Chapter 5 = Conclusion |
| TC-SUB-006 | Compile proposal (Ch 1-3) | 1. Login as Team Leader. 2. Go to Submissions. 3. Click "Compile Proposal". 4. Upload compiled PDF. | File: proposal.pdf | Proposal submission created. All chapters marked as included. | Pending | Pending | Capstone 1 milestone |
| TC-SUB-007 | Adviser reviews submission | 1. Login as Adviser. 2. Go to review queue. 3. Select submission. 4. Review document. 5. Click "Approve" or "Request Revision". | Submission: Pending review | Status updated. Team notified. Review notes saved. | Pending | Pending | Three options: Approve, Revise, Reject |
| TC-SUB-008 | Adviser requests revision | 1. Login as Adviser. 2. Review submission. 3. Click "Request Revision". 4. Add notes. | Notes: "Fix formatting on page 5" | Status: "Revision Required". Team sees feedback. | Pending | Pending | Inline comments available |
| TC-SUB-009 | Student resubmits after revision | 1. Login as Team Leader. 2. View feedback. 3. Upload revised document. | File: chapter1-v2.pdf | New version created (v2). Status back to "Pending Review". | Pending | Pending | Version history maintained |
| TC-SUB-010 | Adviser adds annotation | 1. Login as Adviser. 2. Open submission viewer. 3. Highlight text. 4. Add comment. | Annotation: "Cite source here" at page 3, line 15 | Annotation saved. Visible to team. | Pending | Pending | PDF highlighting |
| TC-SUB-011 | Reply to annotation | 1. Login as Team Member. 2. View submission. 3. Click on annotation. 4. Add reply. | Reply: "Added citation to Smith (2024)" | Reply thread updated. Adviser notified. | Pending | Pending | Threaded discussion |
| TC-SUB-012 | Mark annotation as resolved | 1. Login as Adviser. 2. View annotation thread. 3. Click "Resolve". | Annotation ID: valid | Annotation marked resolved. Strikethrough applied. | Pending | Pending | Track resolution status |
| TC-SUB-013 | View submission version history | 1. Login as Team Member. 2. Go to submission detail. 3. Click "Version History". | N/A | All versions listed with timestamps, file sizes, upload user. | Pending | Pending | Full audit trail |
| TC-SUB-014 | Get submission view URL | 1. Login as authorized user. 2. Click "View Document" on submission. | Submission ID: valid | Pre-signed S3 URL generated. Document opens in viewer. | Pending | Pending | URL expires in 1 hour |
| TC-SUB-015 | Upload final academic paper | 1. Login as Team Leader. 2. Go to Final Submission. 3. Upload academic version. | File: final-academic.pdf | Final academic paper saved. Ready for archival. | Pending | Pending | Capstone 4 requirement |
| TC-SUB-016 | Upload final journal version | 1. Login as Team Leader. 2. Go to Final Submission. 3. Upload journal format. | File: final-journal.pdf | Journal version saved alongside academic. | Pending | Pending | Publishable format |
| TC-SUB-017 | Unlock submission for resubmission | 1. Login as Adviser. 2. Go to accepted submission. 3. Click "Unlock". | Submission: Accepted status | Submission unlocked. Team can upload new version. | Pending | Pending | Exceptional cases only |
| TC-SUB-018 | View latest chapter submission | 1. Call GET /api/submissions/project/:id/chapters/:chapter/latest | Project ID: valid; Chapter: 1 | Returns most recent version of chapter 1. | Pending | Pending | API endpoint test |

---

## MODULE 6: PLAGIARISM CHECKING (TC-PLAG-001 to TC-PLAG-008)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-PLAG-001 | Trigger plagiarism check | 1. Login as Adviser. 2. Go to submission. 3. Click "Check Plagiarism". | Submission ID: valid uploaded document | Job queued. Status: "Processing". | Pending | Pending | Background job via BullMQ |
| TC-PLAG-002 | View plagiarism status | 1. Login. 2. Go to submission. 3. View plagiarism section. | Submission: Being processed | Shows "Processing..." with progress indicator. | Pending | Pending | Real-time status update |
| TC-PLAG-003 | View plagiarism report | 1. Login. 2. Go to submission with completed check. 3. Click "View Report". | Submission: Check complete | Report shows originality %, highlighted matches, sources. | Pending | Pending | Detailed match breakdown |
| TC-PLAG-004 | High plagiarism warning | 1. Trigger check on copied document. 2. View results. | Document: High similarity content | Warning displayed: "Low originality score (< 70%)". | Pending | Pending | Threshold configurable |
| TC-PLAG-005 | Index submission in corpus | 1. Login as Adviser. 2. Go to accepted submission. 3. Click "Add to Corpus". | Submission: Accepted/archived | Submission indexed for future comparisons. | Pending | Pending | Builds comparison database |
| TC-PLAG-006 | Remove from corpus | 1. Login as Adviser. 2. Go to indexed submission. 3. Click "Remove from Corpus". | Submission: In corpus | Submission removed. No longer used for comparisons. | Pending | Pending | Rare use case |
| TC-PLAG-007 | View plagiarism spans | 1. View plagiarism report. 2. Click on highlighted section. | Report with matches | Source document shown. Matching text highlighted. | Pending | Pending | Character-level highlighting |
| TC-PLAG-008 | Plagiarism check fails gracefully | 1. Trigger check on corrupted PDF. | File: corrupted.pdf | Error: "Unable to process document". Status: "Failed". | Pending | Pending | Error handling |

---

## MODULE 7: DOCUMENT MANAGEMENT (TC-DOC-001 to TC-DOC-008)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-DOC-001 | Extract PDF metadata | 1. Upload PDF. 2. Call extract metadata endpoint. | PDF with title, abstract embedded | Title and abstract extracted. Auto-populated in form. | Pending | Pending | OCR fallback for scanned |
| TC-DOC-002 | Upload manuscript to Google Docs | 1. Login as Team Leader. 2. Go to Documents. 3. Click "Upload Manuscript". 4. Select file. | File: manuscript.docx | Converted to Google Docs. Link generated. | Pending | Pending | Google Drive API |
| TC-DOC-003 | Open Google Docs link | 1. Login as authorized user. 2. Click "Open in Google Docs". | Document Type: Chapter 1 | Google Docs opens in new tab with edit access. | Pending | Pending | Permission-aware |
| TC-DOC-004 | Sync Google Docs permissions | 1. Login as Team Leader. 2. Go to document. 3. Click "Sync Permissions". | Document: Shared with team | All team members + adviser get editor access. | Pending | Pending | Auto-permission sync |
| TC-DOC-005 | Sync Google Docs comments | 1. Login as Adviser. 2. Go to document with Google comments. 3. Click "Sync Comments". | Document: Has Google comments | Comments imported to CMS. Displayed in comment panel. | Pending | Pending | Two-way sync |
| TC-DOC-006 | View archived comments | 1. Login. 2. Go to document. 3. View archived comments section. | N/A | All historical comments shown with timestamps, authors. | Pending | Pending | Comment history |
| TC-DOC-007 | Submit document for review | 1. Login as Team Leader. 2. Go to document. 3. Click "Submit for Review". | Document: Draft status | Document submitted. Adviser notified. | Pending | Pending | Triggers review workflow |
| TC-DOC-008 | List project manuscripts | 1. Login. 2. Go to project. 3. View documents section. | Project ID: valid | All manuscripts listed: Chapter 1, 2, 3, Proposal, Finals. | Pending | Pending | Document type filters |

---

## MODULE 8: NOTIFICATION MANAGEMENT (TC-NOTIF-001 to TC-NOTIF-006)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-NOTIF-001 | View notifications | 1. Login. 2. Click notification bell. 3. View list. | N/A | Notifications listed: newest first. Unread count shown. | Pending | Pending | Real-time updates |
| TC-NOTIF-002 | Mark notification as read | 1. Login. 2. Click on unread notification. | Notification ID: unread | Notification marked read. Unread count decremented. | Pending | Pending | Visual indicator change |
| TC-NOTIF-003 | Mark all as read | 1. Login. 2. Click "Mark All as Read". | Multiple unread notifications | All notifications marked read. Count shows 0. | Pending | Pending | Batch operation |
| TC-NOTIF-004 | Delete single notification | 1. Login. 2. Hover notification. 3. Click delete icon. | Notification ID: valid | Notification removed from list. | Pending | Pending | Soft delete |
| TC-NOTIF-005 | Clear all notifications | 1. Login. 2. Click "Clear All". 3. Confirm. | Multiple notifications | All notifications cleared. List empty. | Pending | Pending | Requires confirmation |
| TC-NOTIF-006 | Receive real-time notification | 1. Login as Team Leader. 2. Have Adviser approve submission. | Submission: Approved | Toast notification appears immediately. Bell icon updates. | Pending | Pending | WebSocket/polling |

---

## MODULE 9: EVALUATION & GRADING (TC-EVAL-001 to TC-EVAL-008)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-EVAL-001 | Create evaluation form | 1. Login as Panelist. 2. Go to assigned project. 3. Click "Evaluate". | Project ID: assigned to panelist; Defense: Midterm | Evaluation form opens with rubric categories. | Pending | Pending | Draft mode |
| TC-EVAL-002 | Fill evaluation scores | 1. Open evaluation form. 2. Enter scores per category. 3. Add comments. | Scores: 4, 5, 4, 3, 5; Comments: "Good presentation" | Scores saved as draft. Can be edited. | Pending | Pending | 1-5 scale |
| TC-EVAL-003 | Submit evaluation | 1. Complete evaluation form. 2. Click "Submit Evaluation". 3. Confirm. | Complete evaluation | Evaluation submitted. Locked from edits. Status: Submitted. | Pending | Pending | Cannot edit after submit |
| TC-EVAL-004 | View project evaluations | 1. Login as Instructor. 2. Go to project. 3. View evaluations tab. | Project ID: with submitted evaluations | All panelist evaluations shown. Average scores calculated. | Pending | Pending | Aggregated view |
| TC-EVAL-005 | Release evaluations to students | 1. Login as Instructor. 2. Go to project evaluations. 3. Click "Release to Students". | Project ID: with all evaluations submitted | Evaluations visible to students. Team notified. | Pending | Pending | One-time action |
| TC-EVAL-006 | Student views released evaluation | 1. Login as Team Member. 2. Go to project. 3. View evaluations. | Evaluations: Released | Scores and comments visible. Panelist names may be hidden. | Pending | Pending | Privacy settings |
| TC-EVAL-007 | Get evaluation by ID | 1. Call GET /api/evaluations/detail/:id | Evaluation ID: valid | Full evaluation details returned. | Pending | Pending | API test |
| TC-EVAL-008 | Update draft evaluation | 1. Login as Panelist. 2. Open draft evaluation. 3. Modify scores. 4. Save. | Updated scores: 5, 5, 4, 4, 5 | Draft updated. Ready for submission. | Pending | Pending | Only drafts editable |

---

## MODULE 10: DASHBOARD & ANALYTICS (TC-DASH-001 to TC-DASH-008)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-DASH-001 | View student dashboard | 1. Login as Student. 2. Go to Dashboard. | N/A | Shows: team status, project status, upcoming deadlines, recent notifications. | Pending | Pending | Role-specific view |
| TC-DASH-002 | View adviser dashboard | 1. Login as Adviser. 2. Go to Dashboard. | N/A | Shows: review queue, workload stats, assigned teams. | Pending | Pending | Pending reviews highlighted |
| TC-DASH-003 | View panelist dashboard | 1. Login as Panelist. 2. Go to Dashboard. | N/A | Shows: assigned projects, available topics, evaluation status. | Pending | Pending | Topic selection available |
| TC-DASH-004 | View instructor dashboard | 1. Login as Instructor. 2. Go to Dashboard. | N/A | Shows: system KPIs, pending approvals, workload distribution. | Pending | Pending | Command center view |
| TC-DASH-005 | Get adviser workload | 1. Login as Adviser. 2. View workload section. | N/A | Shows: teams assigned, reviews pending, reviews completed, avg response time. | Pending | Pending | Workload metrics |
| TC-DASH-006 | Get adviser analytics | 1. Login as Adviser. 2. View analytics charts. | N/A | Charts: Reviews over time, approval rate, revision requests. | Pending | Pending | Visual analytics |
| TC-DASH-007 | Get instructor KPIs | 1. Login as Instructor. 2. View KPI dashboard. | N/A | KPIs: Total projects, completion rate, avg time per phase. | Pending | Pending | System-wide metrics |
| TC-DASH-008 | AI workload optimization | 1. Login as Instructor. 2. Click "Optimize Workload". | N/A | AI suggests adviser reassignments for balanced workload. | Pending | Pending | Optional feature |

---

## MODULE 11: ARCHIVE & SEARCH (TC-ARCH-001 to TC-ARCH-006)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-ARCH-001 | Search archive by keyword | 1. Go to Archive page. 2. Enter search term. 3. Click Search. | Keyword: "machine learning" | Matching archived projects listed. Relevance sorted. | Pending | Pending | Full-text search |
| TC-ARCH-002 | Filter archive by year | 1. Go to Archive. 2. Select year filter. 3. Apply. | Year: 2024 | Only 2024 projects shown. | Pending | Pending | Academic year filter |
| TC-ARCH-003 | Filter archive by course | 1. Go to Archive. 2. Select course filter. | Course: BSIT | Only BSIT projects shown. | Pending | Pending | Multiple filters combinable |
| TC-ARCH-004 | View archived project | 1. Go to Archive. 2. Click on project. 3. View details. | Project: Archived project | Full details: title, abstract, authors, adviser, year, documents. | Pending | Pending | Read-only view |
| TC-ARCH-005 | Download archived document | 1. Go to archived project. 2. Click "Download Academic Paper". | Document: Academic version | PDF downloaded to device. | Pending | Pending | Pre-signed URL |
| TC-ARCH-006 | Bulk upload archives | 1. Login as Instructor. 2. Go to Archive Management. 3. Upload ZIP with multiple projects. | ZIP: archive-bundle.zip | Projects extracted and indexed. Import report shown. | Pending | Pending | Admin feature |

---

## MODULE 12: ACADEMIC STRUCTURE (TC-ACAD-001 to TC-ACAD-006)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-ACAD-001 | List courses | 1. Login. 2. Call GET /api/academics/courses. | N/A | All courses listed: BSIT, BSCS, etc. | Pending | Pending | Dropdown population |
| TC-ACAD-002 | Create new course | 1. Login as Instructor. 2. Go to Academic Settings. 3. Add course. | Course Name: BS Data Science; Code: BSDS | Course created. Available in dropdowns. | Pending | Pending | Instructor only |
| TC-ACAD-003 | List sections | 1. Login. 2. Call GET /api/academics/sections with filters. | Course: BSIT | Sections for BSIT listed: 4A, 4B, 4C. | Pending | Pending | Filtered by course |
| TC-ACAD-004 | Create new section | 1. Login as Instructor. 2. Go to Academic Settings. 3. Add section. | Section Name: 4D; Course: BSIT | Section created. Available in registration. | Pending | Pending | Instructor only |
| TC-ACAD-005 | List academic years | 1. Login. 2. Call GET /api/academics/academic-years. | N/A | Academic years listed: 2024-2025, 2025-2026. | Pending | Pending | Semester support |
| TC-ACAD-006 | Create academic year | 1. Login as Instructor. 2. Add academic year. | Year: 2026-2027; Start: 2026-06-01 | Academic year created. Can set as active. | Pending | Pending | One active year |

---

## MODULE 13: SETTINGS & CONFIGURATION (TC-SET-001 to TC-SET-004)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-SET-001 | Get system settings | 1. Login as any user. 2. Call GET /api/settings. | N/A | Current settings returned: announcement, maintenance mode, etc. | Pending | Pending | Read access for all |
| TC-SET-002 | Update system announcement | 1. Login as Instructor. 2. Go to Settings. 3. Update announcement. 4. Save. | Announcement: "Submission deadline extended" | Announcement updated. Visible on all dashboards. | Pending | Pending | Instructor only |
| TC-SET-003 | Enable maintenance mode | 1. Login as Instructor. 2. Go to Settings. 3. Enable maintenance. | Maintenance: true | System enters maintenance. Only Instructors can access. | Pending | Pending | Emergency feature |
| TC-SET-004 | Student cannot modify settings | 1. Login as Student. 2. Try PUT /api/settings. | Any payload | 403 Forbidden. Settings unchanged. | Pending | Pending | Role protection |

---

## MODULE 14: AUDIT LOGGING (TC-AUDIT-001 to TC-AUDIT-004)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-AUDIT-001 | View audit logs | 1. Login as Instructor. 2. Go to Audit Logs page. | N/A | All system actions listed with timestamps, users, actions. | Pending | Pending | Instructor only |
| TC-AUDIT-002 | Search audit logs | 1. Go to Audit Logs. 2. Search by user or action. | Search: "login" | Filtered logs matching "login" shown. | Pending | Pending | Full-text search |
| TC-AUDIT-003 | Filter logs by date | 1. Go to Audit Logs. 2. Select date range. | From: 2026-04-01; To: 2026-04-02 | Only logs within date range shown. | Pending | Pending | Date picker |
| TC-AUDIT-004 | View entity history | 1. Go to specific project. 2. View "History" tab. | Entity: Project ID | All changes to project shown: created, updated, approved, etc. | Pending | Pending | Entity-specific audit |

---

## MODULE 15: ERROR HANDLING & EDGE CASES (TC-ERR-001 to TC-ERR-007)

| Test Case # | Test Case Description | Test Steps | Test Data | Expected Result | Actual Result | Pass/Fail | Remarks |
|---|---|---|---|---|---|---|---|
| TC-ERR-001 | Access protected route without login | 1. Open browser. 2. Navigate to /dashboard without login. | N/A | Redirect to login page. | Pending | Pending | Auth middleware |
| TC-ERR-002 | Access forbidden resource | 1. Login as Student. 2. Navigate to /admin/users. | N/A | 403 Forbidden page displayed. | Pending | Pending | Role-based access |
| TC-ERR-003 | Invalid route (404) | 1. Navigate to /nonexistent-page. | N/A | 404 Not Found page displayed with back button. | Pending | Pending | Catch-all route |
| TC-ERR-004 | API rate limiting | 1. Make 100 requests to /api/auth/login in 1 minute. | Rapid requests | After limit: 429 Too Many Requests. | Pending | Pending | Rate limiter active |
| TC-ERR-005 | Session timeout | 1. Login. 2. Wait for token expiry (15 mins). 3. Try action. | Expired token | Automatic refresh attempted. If fails, redirect to login. | Pending | Pending | Token refresh flow |
| TC-ERR-006 | Upload file too large | 1. Try uploading 100MB file. | File: 100MB PDF | Error: "File exceeds maximum size (25MB)". | Pending | Pending | File size validation |
| TC-ERR-007 | Invalid file type | 1. Try uploading .exe file. | File: program.exe | Error: "Invalid file type. Only PDF allowed." | Pending | Pending | File type validation |

---

## SUMMARY

| Module | Test Case Range | Count |
|--------|----------------|-------|
| Authentication | TC-AUTH-001 to TC-AUTH-015 | 15 |
| User Management | TC-USER-001 to TC-USER-012 | 12 |
| Project Management | TC-PROJ-001 to TC-PROJ-020 | 20 |
| Team Management | TC-TEAM-001 to TC-TEAM-010 | 10 |
| Submission Management | TC-SUB-001 to TC-SUB-018 | 18 |
| Plagiarism Checking | TC-PLAG-001 to TC-PLAG-008 | 8 |
| Document Management | TC-DOC-001 to TC-DOC-008 | 8 |
| Notification Management | TC-NOTIF-001 to TC-NOTIF-006 | 6 |
| Evaluation & Grading | TC-EVAL-001 to TC-EVAL-008 | 8 |
| Dashboard & Analytics | TC-DASH-001 to TC-DASH-008 | 8 |
| Archive & Search | TC-ARCH-001 to TC-ARCH-006 | 6 |
| Academic Structure | TC-ACAD-001 to TC-ACAD-006 | 6 |
| Settings & Configuration | TC-SET-001 to TC-SET-004 | 4 |
| Audit Logging | TC-AUDIT-001 to TC-AUDIT-004 | 4 |
| Error Handling & Edge Cases | TC-ERR-001 to TC-ERR-007 | 7 |
| **TOTAL** | | **140** |

---

**Prepared By:** CMS-V2 QA Team  
**Date:** 2026-04-02  
**Status:** Ready for Execution
