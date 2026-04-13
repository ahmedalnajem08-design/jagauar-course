---
Task ID: 1
Agent: Main
Task: Add login system, trainer model, gender field, admin account, trainer management in settings, and trainer info in print

Work Log:
- Updated Prisma schema to add Trainer model with name, phone, password, role fields
- Added gender field to Trainee model (male/female)
- Added trainerId foreign key to Trainee, ExerciseGroup, and Course models
- Created migration and applied it
- Seeded default admin account (المدير / admin123)
- Created /api/auth route for login
- Created /api/trainers route for trainer CRUD
- Updated /api/trainees to filter by trainerId and support gender
- Updated /api/exercise-groups to filter by trainerId
- Updated /api/courses to filter by trainerId and include trainer relation
- Created useAuth hook with AuthProvider context
- Created LoginPage component with phone/password form
- Updated page.tsx with AuthProvider wrapper and login gate
- Updated TraineesManager with gender field (male/female toggle)
- Updated ExerciseGroupsManager to filter by trainerId
- Updated CourseBuilder to use trainerId
- Updated CoursesList to filter by trainerId, show trainer info, and display gender
- Updated SettingsManager with trainer management tab (admin only)
- Updated print template to show trainer name and phone
- Added user info and logout button to sidebar
- Fixed lint errors

Stage Summary:
- Full authentication system with login gate
- Each trainer sees only their own data (trainees, groups, courses)
- Admin account can manage trainers from Settings
- Gender field (male/female) added to trainee form
- Print template shows trainer name and phone
- Default admin credentials: المدير / admin123
