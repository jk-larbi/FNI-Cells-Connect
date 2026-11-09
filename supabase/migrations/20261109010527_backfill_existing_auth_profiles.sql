-- Create safe ordinary-tutor profiles for Supabase Auth accounts that predate the signup trigger.
-- Never infer or grant administrator roles during backfill.
INSERT INTO public.profiles(id,supabase_user_id,email,full_name,role,is_active,is_onboarded,must_change_password,auth_provider)
SELECT u.id::text,u.id,u.email,
       COALESCE(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',split_part(COALESCE(u.email,''),'@',1)),
       'tutor',true,false,false,COALESCE(u.raw_app_meta_data->>'provider','email')
FROM auth.users u
LEFT JOIN public.profiles p ON p.supabase_user_id=u.id
WHERE p.id IS NULL
ON CONFLICT(id) DO NOTHING;
