import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const ADMIN_ROLES = ["admin", "super_admin", "national_admin"];
const cleanAnswers = (answers: Record<string, unknown>, questionIds: Set<string>) => {
  const clean: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(answers || {})) {
    if (questionIds.has(id)) clean[id] = value;
  }
  return clean;
};
const scoreAutomaticText = (answer: unknown, key: any, maxPoints: number) => {
  const text = String(answer ?? "").trim().toLowerCase();
  const expected = String(key?.expected_answer || key?.correct_answer || "").trim().toLowerCase();
  const alternatives = Array.isArray(key?.acceptable_alternatives) ? key.acceptable_alternatives.map((x: unknown) => String(x).trim().toLowerCase()) : [];
  const keywords = Array.isArray(key?.keywords) ? key.keywords.map((x: unknown) => String(x).trim().toLowerCase()).filter(Boolean) : [];
  const matched: string[] = [];
  let points = 0;
  if (!text) return { points, matched };
  if (expected && text === expected) return { points: maxPoints, matched };
  if (alternatives.some((alt: string) => alt && (text === alt || text.includes(alt)))) return { points: maxPoints, matched };
  for (const keyword of keywords) if (text.includes(keyword)) matched.push(keyword);
  if (keywords.length) {
    const ratio = matched.length / keywords.length;
    if (ratio >= 0.75) points = maxPoints;
    else if (ratio >= 0.5) points = Math.round(maxPoints * 0.7);
    else if (ratio >= 0.25) points = Math.round(maxPoints * 0.4);
  } else if (expected && text.length >= 10 && expected.includes(text)) {
    points = Math.round(maxPoints * 0.5);
  }
  return { points, matched };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete" }, 503);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await db.from("profiles")
    .select("id,role,is_active,full_name,cell_id,cell_name")
    .eq("supabase_user_id", authData.user.id).maybeSingle();
  if (profileError || !profile?.is_active) return json({ error: "An active FNI profile is required" }, 403);
  const isAdmin = ADMIN_ROLES.includes(profile.role);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const action = String(body?.action || "");
  const fail = (message: string, status = 400) => json({ error: message }, status);
  const requireAdmin = () => isAdmin ? null : fail("Administrator access required", 403);

  const syncState = async (quizId: string, tutorId: string, eventType: string, attemptId: string | null = null) => {
    const { error } = await db.from("learning_quiz_sync_state").upsert({
      id: quizId + ":" + tutorId,
      quiz_id: quizId,
      tutor_id: tutorId,
      attempt_id: attemptId,
      event_type: eventType,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  };

  const fetchQuestions = async (quizId: string) => {
    const { data, error } = await db.from("learning_quiz_questions").select("*").eq("quiz_id", quizId).order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const fetchAnswerKeys = async (quizId: string) => {
    const { data, error } = await db.from("learning_quiz_answer_keys").select("*").eq("quiz_id", quizId);
    if (error) throw error;
    return data || [];
  };

  if (action === "get_editor_questions") {
    const denied = requireAdmin(); if (denied) return denied;
    if (!body.quizId) return fail("Quiz ID is required");
    const [questions, keys] = await Promise.all([fetchQuestions(body.quizId), fetchAnswerKeys(body.quizId)]);
    const byId = new Map(keys.map((k: any) => [k.question_id, k]));
    return json(questions.map((q: any) => {
      const key: any = byId.get(q.id) || {};
      return {
        ...q,
        correct_answer: key.correct_answer,
        explanation: key.explanation,
        expected_answer: key.expected_answer,
        acceptable_alternatives: key.acceptable_alternatives || [],
        keywords: key.keywords || [],
      };
    }));
  }

  if (action === "save_quiz") {
    const denied = requireAdmin(); if (denied) return denied;
    const quiz = body.quiz;
    const questions = Array.isArray(body.questions) ? body.questions : [];
    if (!quiz?.id || !String(quiz.title || "").trim()) return fail("Quiz title and ID are required");
    const desiredStatus = ["draft", "published", "archived"].includes(quiz.status) ? quiz.status : "draft";
    if (desiredStatus === "published" && questions.length === 0) return fail("Add at least one question before publishing this quiz");
    const quizRow = {
      id: String(quiz.id),
      title: String(quiz.title).trim(),
      description: String(quiz.description || ""),
      instructions: String(quiz.instructions || ""),
      time_limit_minutes: Number(quiz.time_limit_minutes || 0),
      passing_score: Number(quiz.passing_score ?? 70),
      total_points: Number(quiz.total_points ?? 100),
      mcq_points: Number(quiz.mcq_points ?? 0),
      subjective_points: Number(quiz.subjective_points ?? 0),
      has_mcq: Boolean(quiz.has_mcq),
      has_subjective: Boolean(quiz.has_subjective),
      published_at: quiz.published_at || null,
      due_date: quiz.due_date,
      status: "draft",
      results_released: false,
      timing_settings: quiz.timing_settings || {},
      created_by: profile.id,
      updated_at: new Date().toISOString(),
    };
    const { error: quizError } = await db.from("learning_quizzes").upsert(quizRow);
    if (quizError) return fail("Could not save quiz: " + quizError.message, 400);

    const { error: deleteError } = await db.from("learning_quiz_questions").delete().eq("quiz_id", quizRow.id);
    if (deleteError) return fail("Could not replace quiz questions: " + deleteError.message, 400);

    const questionRows: any[] = [];
    const keyRows: any[] = [];
    for (let index = 0; index < questions.length; index++) {
      const q = questions[index] || {};
      const section = q.section === "subjective" || q.question_type === "written" || q.question_type === "short_answer" ? "subjective" : "mcq";
      const qid = String(q.id || ("q-" + crypto.randomUUID()));
      const questionType = section === "subjective" ? (q.question_type === "short_answer" ? "short_answer" : "written") : (q.question_type === "true_false" ? "true_false" : "multiple_choice");
      questionRows.push({
        id: qid, quiz_id: quizRow.id, section,
        question_text: String(q.question_text || ""),
        question_type: questionType,
        options: Array.isArray(q.options) ? q.options : [],
        points: Number(q.points || 10),
        marking_method: section === "subjective" ? (q.marking_method === "automatic" ? "automatic" : "manual") : null,
      });
      keyRows.push({
        question_id: qid, quiz_id: quizRow.id,
        correct_answer: q.correct_answer === undefined || q.correct_answer === null ? (section === 'mcq' ? '0' : null) : String(q.correct_answer),
        explanation: String(q.explanation || ""),
        expected_answer: String(q.expected_answer || ""),
        acceptable_alternatives: Array.isArray(q.acceptable_alternatives) ? q.acceptable_alternatives : [],
        keywords: Array.isArray(q.keywords) ? q.keywords : [],
      });
    }
    if (questionRows.length) {
      const { error: qError } = await db.from("learning_quiz_questions").insert(questionRows);
      if (qError) return fail("Could not save quiz questions: " + qError.message, 400);
      const { error: kError } = await db.from("learning_quiz_answer_keys").insert(keyRows);
      if (kError) return fail("Could not save protected answer keys: " + kError.message, 400);
    }
    const { error: publishError } = await db.from("learning_quizzes")
      .update({ status: desiredStatus, published_at: quizRow.published_at, updated_at: new Date().toISOString() })
      .eq("id", quizRow.id);
    if (publishError) return fail("Questions were saved but quiz status could not be updated: " + publishError.message, 500);
    quizRow.status = desiredStatus;
    return json({ success: true, quiz: quizRow });
  }

  if (action === "start_attempt" || action === "get_session") {
    if (isAdmin || profile.role !== "tutor") return fail("Only an active tutor can take this quiz", 403);
    if (!body.quizId) return fail("Quiz ID is required");
    const { data: quiz, error: quizError } = await db.from("learning_quizzes").select("*").eq("id", body.quizId).maybeSingle();
    if (quizError || !quiz || quiz.status !== "published") return fail("This quiz is not available", 404);
    const timing = quiz.timing_settings || {};
    const now = new Date();
    const opensAt = timing.opens_at ? new Date(timing.opens_at) : null;
    const closesAt = timing.closes_at ? new Date(timing.closes_at) : (quiz.due_date ? new Date(quiz.due_date) : null);
    if (opensAt && now < opensAt) return fail("This quiz has not opened yet", 409);
    const lateAllowed = Boolean(timing.allow_late_submissions);
    if (closesAt && now > closesAt && !lateAllowed && action !== "get_session") return fail("This quiz has closed", 409);

    let session: any = null;
    if (body.sessionId) {
      const { data } = await db.from("learning_quiz_sessions").select("*")
        .eq("id", body.sessionId).eq("quiz_id", quiz.id).eq("tutor_id", profile.id).is("consumed_at", null).maybeSingle();
      session = data;
      if (!session) return fail("This quiz session is no longer available", 409);
    } else {
      const { data } = await db.from("learning_quiz_sessions").select("*")
        .eq("quiz_id", quiz.id).eq("tutor_id", profile.id).is("consumed_at", null).maybeSingle();
      session = data;
    }
    if (!session && action === "get_session") return fail("No active quiz session was found", 404);
    if (!session) {
      const { count, error: countError } = await db.from("learning_quiz_attempts").select("id", { count: "exact", head: true })
        .eq("quiz_id", quiz.id).eq("tutor_id", profile.id);
      if (countError) return fail("Could not check attempt limit: " + countError.message, 500);
      const maxAttempts = Number(timing.max_attempts ?? 1);
      if (maxAttempts > 0 && (count || 0) >= maxAttempts) return fail("You have reached the maximum allowed attempts", 409);
      const startedAt = now.toISOString();
      const duration = Number(timing.time_limit_minutes ?? quiz.time_limit_minutes ?? 15);
      const expiresAt = duration > 0 ? new Date(now.getTime() + duration * 60000).toISOString() : null;
      const { data, error } = await db.from("learning_quiz_sessions").insert({
        quiz_id: quiz.id, tutor_id: profile.id, started_at: startedAt, expires_at: expiresAt, answers: {},
      }).select("*").single();
      if (error) return fail("Could not start quiz session: " + error.message, 500);
      session = data;
      await syncState(quiz.id, profile.id, 'session_started');
    }
    return json({
      sessionId: session.id,
      startedAt: session.started_at,
      expiresAt: session.expires_at,
      answers: session.answers || {},
      expired: Boolean(session.expires_at && now >= new Date(session.expires_at)),
      quizId: quiz.id,
    });
  }

  if (action === "save_draft") {
    if (isAdmin || profile.role !== "tutor") return fail("Tutor access required", 403);
    if (!body.sessionId || !body.quizId) return fail("Quiz session is required");
    const { data: session } = await db.from("learning_quiz_sessions").select("id,quiz_id,tutor_id,consumed_at,expires_at")
      .eq("id", body.sessionId).eq("quiz_id", body.quizId).eq("tutor_id", profile.id).maybeSingle();
    if (!session || session.consumed_at) return fail("Quiz session is no longer active", 409);
    if (session.expires_at && new Date() >= new Date(session.expires_at)) return fail("Quiz time has expired", 409);
    const questions = await fetchQuestions(body.quizId);
    const validIds = new Set(questions.map((q: any) => q.id));
    const answers = cleanAnswers(body.answers || {}, validIds);
    const { error } = await db.from("learning_quiz_sessions").update({ answers }).eq("id", session.id);
    if (error) return fail("Could not sync quiz draft: " + error.message, 500);
    await syncState(body.quizId, profile.id, "draft_updated");
    return json({ success: true, savedAt: new Date().toISOString() });
  }

  if (action === "submit_attempt") {
    if (isAdmin || profile.role !== "tutor") return fail("Tutor access required", 403);
    if (!body.quizId || !body.sessionId) return fail("Quiz session is required");
    const { data: session, error: sessionError } = await db.from("learning_quiz_sessions").select("*")
      .eq("id", body.sessionId).eq("quiz_id", body.quizId).eq("tutor_id", profile.id).is("consumed_at", null).maybeSingle();
    if (sessionError || !session) return fail("Quiz session is invalid or has already been submitted", 409);
    const { data: quiz, error: quizError } = await db.from("learning_quizzes").select("*").eq("id", body.quizId).maybeSingle();
    if (quizError || !quiz || quiz.status !== "published") return fail("Quiz is no longer available", 404);
    const timing = quiz.timing_settings || {};
    const now = new Date();
    const closesAt = timing.closes_at ? new Date(timing.closes_at) : (quiz.due_date ? new Date(quiz.due_date) : null);
    const isLate = Boolean(closesAt && now > closesAt);
    if (isLate && !timing.allow_late_submissions) return fail("The quiz deadline has passed", 409);
    const timeExpired = Boolean(session.expires_at && now >= new Date(session.expires_at));
    const { count, error: countError } = await db.from("learning_quiz_attempts").select("id", { count: "exact", head: true })
      .eq("quiz_id", quiz.id).eq("tutor_id", profile.id);
    if (countError) return fail("Could not verify attempt limit", 500);
    const maxAttempts = Number(timing.max_attempts ?? 1);
    if (maxAttempts > 0 && (count || 0) >= maxAttempts) return fail("Maximum quiz attempts reached", 409);

    const [questions, keys] = await Promise.all([fetchQuestions(quiz.id), fetchAnswerKeys(quiz.id)]);
    const keyMap = new Map(keys.map((k: any) => [k.question_id, k]));
    const answers = cleanAnswers(body.answers || session.answers || {}, new Set(questions.map((q: any) => q.id)));
    let totalScore = 0;
    let totalPossible = 0;
    let needsManual = false;
    const grades: Record<string, any> = {};
    for (const q of questions) {
      const key: any = keyMap.get(q.id) || {};
      const maxPoints = Number(q.points || 10);
      const answer = answers[q.id];
      totalPossible += maxPoints;
      const isObjective = q.section === "mcq" || q.question_type === "multiple_choice" || q.question_type === "true_false";
      if (isObjective) {
        const correct = String(answer ?? "") === String(key.correct_answer ?? "");
        const awarded = correct ? maxPoints : 0;
        totalScore += awarded;
        grades[q.id] = {
          question_id: q.id, question_text: q.question_text, section: "mcq", user_answer: answer,
          max_points: maxPoints, points_awarded: awarded, is_correct: correct, is_manual_review_needed: false,
        };
      } else if ((q.marking_method || "manual") === "automatic") {
        const result = scoreAutomaticText(answer, key, maxPoints);
        totalScore += result.points;
        grades[q.id] = {
          question_id: q.id, question_text: q.question_text, section: "subjective", marking_method: "automatic",
          user_answer: answer, keywords_matched: result.matched, max_points: maxPoints,
          points_awarded: result.points, is_correct: result.points === maxPoints, is_manual_review_needed: false,
        };
      } else {
        needsManual = true;
        grades[q.id] = {
          question_id: q.id, question_text: q.question_text, section: "subjective", marking_method: "manual",
          user_answer: answer, max_points: maxPoints, points_awarded: 0, is_manual_review_needed: true,
        };
      }
    }
    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    const passed = percentage >= Number(quiz.passing_score || 70);
    const releasePolicy = timing.result_release_policy || "immediate";
    const resultsReleased = !needsManual && (releasePolicy === "immediate" || (releasePolicy === "after_close" && Boolean(closesAt && now >= closesAt)));
    const status = timeExpired ? "time_expired" : (isLate ? "submitted_late" : (needsManual ? "awaiting_grading" : "graded"));
    const attemptId = "att-" + crypto.randomUUID();
    const attemptNumber = (count || 0) + 1;
    const attemptRow = {
      id: attemptId, quiz_id: quiz.id, tutor_id: profile.id, tutor_name: profile.full_name || "Tutor",
      cell_id: profile.cell_id, cell_name: profile.cell_name, attempt_number: attemptNumber,
      answers, question_grades: grades, score: totalScore, total_possible: totalPossible, percentage, passed,
      started_at: session.started_at, completed_at: now.toISOString(), status,
      grading_status: needsManual ? "awaiting_grading" : "graded", results_released: resultsReleased,
    };
    const { error: insertError } = await db.from("learning_quiz_attempts").insert(attemptRow);
    if (insertError) return fail("Could not submit quiz: " + insertError.message, 500);
    await db.from("learning_quiz_sessions").update({ consumed_at: now.toISOString() }).eq("id", session.id);
    await syncState(quiz.id, profile.id, "attempt_submitted", attemptId);
    const response: any = { ...attemptRow, quiz_title: quiz.title };
    if (resultsReleased) {
      for (const [qid, grade] of Object.entries(grades)) {
        const key: any = keyMap.get(qid) || {};
        response.question_grades[qid] = {
          ...grade, correct_answer: key.correct_answer, expected_answer: key.expected_answer,
        };
      }
    } else {
      response.question_grades = {};
      response.score = 0; response.total_possible = Number(quiz.total_points || totalPossible);
      response.percentage = 0; response.passed = false;
    }
    return json(response);
  }

  if (action === "get_attempts") {
    if (!isAdmin && profile.role !== "tutor") return fail("Tutor access required", 403);

    // Release automatically graded results once an "after_close" quiz reaches its close time.
    const { data: closingQuizzes } = await db.from("learning_quizzes").select("id,timing_settings").eq("status", "published");
    for (const closingQuiz of closingQuizzes || []) {
      const timing = closingQuiz.timing_settings || {};
      const closesAt = timing.closes_at ? new Date(timing.closes_at) : null;
      if (timing.result_release_policy !== "after_close" || !closesAt || new Date() < closesAt) continue;
      const { data: dueAttempts } = await db.from("learning_quiz_attempts")
        .update({ results_released: true })
        .eq("quiz_id", closingQuiz.id).eq("grading_status", "graded").eq("results_released", false)
        .select("id,tutor_id");
      for (const dueAttempt of dueAttempts || []) {
        await syncState(closingQuiz.id, dueAttempt.tutor_id, "results_released", dueAttempt.id);
      }
      await db.from("learning_quizzes").update({ results_released: true }).eq("id", closingQuiz.id);
    }

    let query = db.from("learning_quiz_attempts").select("*").order("completed_at", { ascending: false });
    if (!isAdmin) query = query.eq("tutor_id", profile.id);
    else if (body.tutorId) query = query.eq("tutor_id", body.tutorId);
    if (body.quizId) query = query.eq("quiz_id", body.quizId);
    const { data: attempts, error } = await query;
    if (error) return fail("Could not load quiz attempts: " + error.message, 500);
    const rows = attempts || [];
    const quizIds = [...new Set(rows.map((a: any) => a.quiz_id))];
    const keyMap = new Map<string, any>();
    if (quizIds.length) {
      const [{ data: questions }, { data: keys }, { data: quizzes }] = await Promise.all([
        db.from("learning_quiz_questions").select("*").in("quiz_id", quizIds),
        db.from("learning_quiz_answer_keys").select("*").in("quiz_id", quizIds),
        db.from("learning_quizzes").select("id,title").in("id", quizIds),
      ]);
      for (const k of keys || []) keyMap.set(k.question_id, k);
      const titleMap = new Map((quizzes || []).map((q: any) => [q.id, q.title]));
      return json(rows.map((a: any) => {
        const released = isAdmin || Boolean(a.results_released);
        const details: Record<string, any> = {};
        if (released) {
          for (const [qid, grade] of Object.entries(a.question_grades || {})) {
            const key: any = keyMap.get(qid) || {};
            details[qid] = { ...(grade as any), correct_answer: key.correct_answer, expected_answer: key.expected_answer };
          }
        }
        return {
          ...a, quiz_title: titleMap.get(a.quiz_id) || "Quiz",
          question_grades: released ? (isAdmin ? Object.fromEntries(Object.entries(a.question_grades || {}).map(([qid, grade]) => {
            const key: any = keyMap.get(qid) || {};
            return [qid, { ...(grade as any), correct_answer: key.correct_answer, expected_answer: key.expected_answer }];
          })) : details) : {},
          score: released ? a.score : 0,
          total_possible: released ? a.total_possible : Number((rows.find((x: any) => x.id === a.id)?.total_possible) || 0),
          percentage: released ? a.percentage : 0,
          passed: released ? a.passed : false,
          feedback: released ? a.feedback : null,
          graded_by: released ? a.graded_by : null,
          graded_at: released ? a.graded_at : null,
        };
      }));
    }
    return json(rows.map((a: any) => ({
      ...a, question_grades: isAdmin || a.results_released ? a.question_grades : {},
      score: isAdmin || a.results_released ? a.score : 0,
      percentage: isAdmin || a.results_released ? a.percentage : 0,
      passed: isAdmin || a.results_released ? a.passed : false,
      feedback: isAdmin || a.results_released ? a.feedback : null,
    })));
  }

  if (action === "grade_attempt") {
    const denied = requireAdmin(); if (denied) return denied;
    if (!body.attemptId || !body.questionGrades) return fail("Attempt and grading details are required");
    const { data: attempt, error: attemptError } = await db.from("learning_quiz_attempts").select("*").eq("id", body.attemptId).maybeSingle();
    if (attemptError || !attempt) return fail("Quiz attempt not found", 404);
    const [questions, keys] = await Promise.all([fetchQuestions(attempt.quiz_id), fetchAnswerKeys(attempt.quiz_id)]);
    const keyMap = new Map(keys.map((k: any) => [k.question_id, k]));
    const grades: Record<string, any> = {};
    let score = 0, total = 0;
    for (const q of questions) {
      const submitted = body.questionGrades[q.id] || {};
      const maxPoints = Number(q.points || 10);
      const awarded = Math.max(0, Math.min(maxPoints, Number(submitted.points_awarded || 0)));
      total += maxPoints; score += awarded;
      const grade: any = {
        question_id: q.id, question_text: q.question_text, section: q.section,
        marking_method: q.marking_method, user_answer: (attempt.answers || {})[q.id],
        max_points: maxPoints, points_awarded: awarded,
        is_correct: awarded === maxPoints, is_manual_review_needed: false,
        feedback: String(submitted.feedback || ""),
      };
      if (body.releaseResults) {
        const key: any = keyMap.get(q.id) || {};
        grade.correct_answer = key.correct_answer;
        grade.expected_answer = key.expected_answer;
      }
      grades[q.id] = grade;
    }
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const { error: updateError } = await db.from("learning_quiz_attempts").update({
      question_grades: grades, score, total_possible: total, percentage,
      passed: percentage >= Number((await db.from("learning_quizzes").select("passing_score").eq("id", attempt.quiz_id).single()).data?.passing_score || 70),
      status: "graded", grading_status: "graded", results_released: Boolean(body.releaseResults),
      feedback: String(body.feedback || ""), graded_by: profile.full_name || profile.id, graded_at: new Date().toISOString(),
    }).eq("id", attempt.id);
    if (updateError) return fail("Could not save grading: " + updateError.message, 500);
    await syncState(attempt.quiz_id, attempt.tutor_id, body.releaseResults ? "results_released" : "graded", attempt.id);
    return json({ success: true });
  }

  if (action === "release_all") {
    const denied = requireAdmin(); if (denied) return denied;
    if (!body.quizId) return fail("Quiz ID is required");
    const { data: attempts, error } = await db.from("learning_quiz_attempts").select("id,tutor_id")
      .eq("quiz_id", body.quizId).eq("grading_status", "graded");
    if (error) return fail("Could not load quiz attempts", 500);
    for (const attempt of attempts || []) {
      const { error: updateError } = await db.from("learning_quiz_attempts").update({ results_released: true }).eq("id", attempt.id);
      if (updateError) return fail("Could not release all quiz results", 500);
      await syncState(body.quizId, attempt.tutor_id, "results_released", attempt.id);
    }
    await db.from("learning_quizzes").update({ results_released: true }).eq("id", body.quizId);
    return json({ success: true, released: (attempts || []).length });
  }

  return fail("Unsupported learning quiz action", 400);
});
