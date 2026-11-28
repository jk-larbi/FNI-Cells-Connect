import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const view = read('../src/components/auth/AuthView.tsx');
const styles = read('../src/index.css');
const auth = read('../src/services/authService.ts');
const tutorAuth = read('../supabase/functions/tutor-auth/index.ts');

assert.match(view, /'tutor-signup'.*'login-select'.*'tutor-login'.*'admin-login'/, 'the public auth flow must expose tutor signup, tutor login and a separate admin login');
assert.match(view, /registerTutor\(\{[\s\S]*?fullName: cleanName[\s\S]*?password: regPassword[\s\S]*?confirmPassword: regConfirmPassword[\s\S]*?cellId: signupCellId/, 'tutor signup must submit the real cell, full name and confirmed password');
assert.match(view, /loginTutor\(\{[\s\S]*?cellId: loginCellId[\s\S]*?fullName: loginTutorName\.trim\(\)[\s\S]*?password: loginPassword/, 'tutor login must authenticate with the selected cell and registered tutor identity');
assert.match(view, /loginAdmin\(\{[\s\S]*?username: adminEmail\.trim\(\)[\s\S]*?password: adminPassword/, 'administrator login must use its own server-verified login flow');
assert.match(view, /Register as a Tutor/, 'registration must be labelled clearly for tutors');
assert.match(view, /Log In as Administrator/, 'the login selector must retain a distinct administrator option');
assert.match(tutorAuth, /role: "tutor"/, 'self-registration must always create tutor accounts');
assert.match(tutorAuth, /!\["admin", "super_admin", "national_admin"\]\.includes\(profile\.role\)/, 'administrator access must be checked server-side');
assert.match(styles, /data-auth-view="tutor-signup"/, 'tutor registration must have a dedicated responsive Stitch layout');
assert.match(styles, /data-auth-view="tutor-login"/, 'tutor login must have a dedicated responsive Stitch layout');
assert.match(styles, /data-auth-view="login-select"/, 'account-type selection must have a dedicated responsive Stitch layout');
assert.match(styles, /html\.dark \.fni-auth-portal\[data-auth-view="tutor-signup"\]/, 'tutor registration must remain readable in dark mode');
assert.match(styles, /html\.dark \.fni-auth-portal\[data-auth-view="tutor-login"\]/, 'tutor login must remain readable in dark mode');

console.log('FNI tutor registration, tutor login, administrator login and responsive theme checks passed.');
