-- 视频通话会话表
CREATE TABLE IF NOT EXISTS video_call_sessions (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER NOT NULL REFERENCES users(id),
  callee_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, ended
  reject_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMP,
  ended_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_video_call_callee_status ON video_call_sessions(callee_id, status);
CREATE INDEX idx_video_call_caller_status ON video_call_sessions(caller_id, status);
