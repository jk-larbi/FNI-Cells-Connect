revoke execute on function public.fni_delete_community_message_for_everyone(text) from public, anon;
revoke execute on function public.fni_delete_private_message_for_everyone(text) from public, anon;
revoke execute on function public.fni_edit_chat_message(text,text,text) from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.fni_delete_community_message_for_everyone(text) to authenticated;
grant execute on function public.fni_delete_private_message_for_everyone(text) to authenticated;
grant execute on function public.fni_edit_chat_message(text,text,text) to authenticated;
grant execute on function public.is_admin() to authenticated;
