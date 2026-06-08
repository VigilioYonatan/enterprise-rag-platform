-- Capture all retrieved sources supplied to the generator, not just the sources it cited.
-- Retain reference IDs after revocation; NEVER store source text in this table.
CREATE TABLE IF NOT EXISTS answer_evidence (
 message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
 document_id uuid NOT NULL,
 chunk_id uuid NOT NULL,
 document_version integer NOT NULL CHECK(document_version>0),
 PRIMARY KEY(message_id,chunk_id)
);
CREATE INDEX IF NOT EXISTS answer_evidence_doc_idx ON answer_evidence(document_id);
ALTER TABLE answer_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY answer_evidence_owner ON answer_evidence TO rag_app
 USING (EXISTS (SELECT 1 FROM messages m JOIN conversations conv ON conv.id=m.conversation_id
    WHERE m.id=message_id AND conv.created_by_sub=actor_sub() AND conv.deleted_at IS NULL)
    AND can_read_document(document_id))
 WITH CHECK (EXISTS (SELECT 1 FROM messages m JOIN conversations conv ON conv.id=m.conversation_id
    WHERE m.id=message_id AND conv.created_by_sub=actor_sub() AND conv.deleted_at IS NULL)
    AND can_read_document(document_id));
GRANT SELECT,INSERT ON answer_evidence TO rag_app;
-- The definer evaluates the full evidence set even when the caller can no longer SELECT it.
-- The inner conversation owner check prevents an oracle for other users' messages.
CREATE OR REPLACE FUNCTION answer_has_revoked_evidence(message_key uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
 SELECT EXISTS(
  SELECT 1 FROM answer_evidence ev
  JOIN messages msg ON msg.id=ev.message_id
  JOIN conversations conv ON conv.id=msg.conversation_id
  LEFT JOIN documents doc ON doc.id=ev.document_id
  LEFT JOIN document_chunks ch ON ch.id=ev.chunk_id AND ch.document_id=ev.document_id
  WHERE ev.message_id=message_key AND conv.created_by_sub=actor_sub()
   AND (doc.id IS NULL OR ch.id IS NULL OR NOT can_read_document(ev.document_id) OR doc.version<>ev.document_version)
 ) OR EXISTS(
  SELECT 1 FROM answer_citations cite
  JOIN messages msg ON msg.id=cite.message_id
  JOIN conversations conv ON conv.id=msg.conversation_id
  LEFT JOIN documents doc ON doc.id=cite.document_id
  WHERE cite.message_id=message_key AND conv.created_by_sub=actor_sub()
   AND (doc.id IS NULL OR NOT can_read_document(cite.document_id) OR doc.version<>cite.document_version)
 ) $$;
GRANT EXECUTE ON FUNCTION answer_has_revoked_evidence(uuid) TO rag_app;
