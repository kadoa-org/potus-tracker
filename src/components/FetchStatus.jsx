export function FetchStatus({ loading, error, isValidating }) {
  if (loading) return <p className="status-message">Loading data...</p>;
  if (isValidating) return <p className="status-message">Refreshing data...</p>;
  if (error) return <p className="status-message error">Error: {error}</p>;
  return null;
}
