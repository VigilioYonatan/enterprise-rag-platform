-- RLS protects current chunk/citation reads; this helper also hides stored answer text
-- when any source previously used for that answer is no longer authorized.
CREATE OR REPLACE FUNCTION answer_has_revoked_evidence(message_key uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
SELECT EXISTS(
 SELECT 1 FROM answer_citations cite
 JOIN messages msg ON msg.id=cite.message_id
 JOIN conversations conv ON conv.id=msg.conversation_id
 JOIN documents doc ON doc.id=cite.document_id
 WHERE cite.message_id=message_key AND conv.created_by_sub=actor_sub()
   AND (NOT can_read_document(cite.document_id) OR doc.version<>cite.document_version)
) $$;
GRANT EXECUTE ON FUNCTION answer_has_revoked_evidence(uuid) TO rag_app;
