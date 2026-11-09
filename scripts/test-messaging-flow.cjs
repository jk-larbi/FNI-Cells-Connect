const { createClient } = require('@supabase/supabase-js');
const url = 'https://cjskjazsrrbfyjepwyxa.supabase.co';
const key = 'sb_publishable_0nQJMgCvgruw3CXX9YpBIg_Jq2rAx-Q';

async function testMessaging() {
  const client1 = createClient(url, key);
  const client2 = createClient(url, key);

  // 1. Sign in tutor
  const tutorPhone = '0241234567';
  const { data: tAuth } = await client1.auth.signInWithPassword({
    email: tutorPhone + '@fnicells.org',
    password: tutorPhone
  });
  console.log('Tutor signed in:', tAuth.user?.id);

  // 2. Sign in admin
  const { data: aAuth } = await client2.auth.signInWithPassword({
    email: 'fniadmin@gmail.com',
    password: 'admin123'
  });
  console.log('Admin signed in:', aAuth.user?.id);

  // 3. Tutor sends private message to admin
  const msgId = 'pmsg-test-' + Date.now();
  const sendRes = await client1.from('private_messages').insert({
    id: msgId,
    sender_uid: tAuth.user.id,
    sender_name: 'Test Tutor',
    sender_role: 'tutor',
    recipient_uid: aAuth.user.id,
    recipient_name: 'FNI Administrator',
    cell_name: 'Test Cell',
    content: 'Hello Pastor, reporting in!',
    is_read: false
  });
  console.log('Tutor sent message status:', sendRes.error ? sendRes.error : 'success');

  // 4. Admin queries the message
  const adminQuery = await client2.from('private_messages')
    .select('*')
    .eq('id', msgId);
  console.log('Admin received message:', adminQuery.error ? adminQuery.error : adminQuery.data);

  // 5. Admin replies
  const replyId = 'pmsg-reply-' + Date.now();
  const replyRes = await client2.from('private_messages').insert({
    id: replyId,
    sender_uid: aAuth.user.id,
    sender_name: 'FNI Administrator',
    sender_role: 'super_admin',
    recipient_uid: tAuth.user.id,
    recipient_name: 'Test Tutor',
    cell_name: 'Test Cell',
    content: 'God bless you! Received.',
    is_read: false
  });
  console.log('Admin replied status:', replyRes.error ? replyRes.error : 'success');

  // 6. Tutor queries reply
  const tutorQuery = await client1.from('private_messages')
    .select('*')
    .eq('id', replyId);
  console.log('Tutor received reply:', tutorQuery.error ? tutorQuery.error : tutorQuery.data);
}

testMessaging();
