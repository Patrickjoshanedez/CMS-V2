# Lesson: Zod Validation Stripping Fields (memberRoleAssignments)

## Issue
Tests in `title-similarity.test.js` (and other project tests) were failing with a `400 Bad Request` during project creation (`studentAgent.post('/api/projects')`). 

## Root Cause
The validation layer (Zod) was stripping the `memberRoleAssignments` array from the incoming payload because it was not explicitly or correctly defined in the required validation schema. The backend service (`project.service.js`) strictly required `memberRoleAssignments` for successful project creation, resulting in a validation failure and a `400 Bad Request` when the stripped payload reached the service.

## Resolution
1. Emphasized the necessity of aligning Zod schema properties exactly with the required service payload.
2. Updated the validation schema (`project.validation.js`) or the test payloads/helpers (`helpers.js`) to ensure `memberRoleAssignments` is properly validated and retained during the request pipeline.
3. Tests passing successfully after ensuring the property is not stripped.

## Prevention
Always ensure that all properties required by the service layer are explicitly defined in the Zod schema payload to prevent silent stripping of required properties.