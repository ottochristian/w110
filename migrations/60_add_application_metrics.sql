-- Migration: Add application metrics table for monitoring dashboard
-- This table stores custom business metrics, performance data, and health indicators
-- Created: 2026-03-10

-- Create application_metrics table
CREATE TABLE IF NOT EXISTS application_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  -- Constraints
  CONSTRAINT metric_name_not_empty CHECK (length(metric_name) > 0),
  CONSTRAINT metric_value_finite CHECK (metric_value IS NOT NULL)
);

-- Indexes for fast queries
CREATE INDEX idx_metrics_name_time ON application_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_metrics_severity_time ON application_metrics(severity, recorded_at DESC) WHERE severity IS NOT NULL;
CREATE INDEX idx_metrics_recorded_at ON application_metrics(recorded_at DESC);

-- Add comments for documentation
COMMENT ON TABLE application_metrics IS 'Stores application monitoring metrics for the super admin dashboard';
COMMENT ON COLUMN application_metrics.metric_name IS 'Name of the metric (e.g., registration.created, payment.failed, api.response_time)';
COMMENT ON COLUMN application_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN application_metrics.metadata IS 'Additional context as JSON (e.g., user_id, endpoint, error_message)';
COMMENT ON COLUMN application_metrics.severity IS 'Severity level: info, warning, error, or critical';

-- Create view for common metric queries
CREATE OR REPLACE VIEW metrics_last_24h AS
SELECT 
  metric_name,
  COUNT(*) as count,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  MAX(recorded_at) as last_recorded
FROM application_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY metric_name
ORDER BY last_recorded DESC;

COMMENT ON VIEW metrics_last_24h IS 'Summary of metrics in the last 24 hours';

-- Create function to clean old metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM application_metrics
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_metrics() IS 'Deletes metrics older than 30 days. Returns count of deleted rows.';

-- Grant permissions (assuming standard roles)
-- System admins can read all metrics
GRANT SELECT ON application_metrics TO authenticated;
GRANT SELECT ON metrics_last_24h TO authenticated;

-- Service role can insert/delete metrics
GRANT INSERT, DELETE ON application_metrics TO service_role;

-- Add RLS policy (only system admins can view metrics)
ALTER TABLE application_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view all metrics"
  ON application_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "Service role can insert metrics"
  ON application_metrics
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can delete old metrics"
  ON application_metrics
  FOR DELETE
  TO service_role
  USING (recorded_at < NOW() - INTERVAL '30 days');

-- Insert sample metrics for testing
INSERT INTO application_metrics (metric_name, metric_value, metadata, severity) VALUES
  ('system.health_check', 1, '{"component": "database", "status": "healthy"}', 'info'),
  ('system.health_check', 1, '{"component": "stripe", "status": "healthy"}', 'info'),
  ('registration.created', 1, '{"club_id": "test", "program_id": "test"}', 'info'),
  ('api.response_time', 234, '{"endpoint": "/api/health", "method": "GET"}', 'info'),
  ('email.sent', 1, '{"to": "test@example.com", "type": "welcome"}', 'info')
ON CONFLICT DO NOTHING;
