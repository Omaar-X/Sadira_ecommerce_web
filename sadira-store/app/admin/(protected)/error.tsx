"use client";
export default function AdminError({ retry }: { retry: () => void }) { return <div className="admin-notice" role="alert"><p>Unable to load this page. Please try again.</p><button className="admin-button" onClick={retry}>Try again</button></div>; }
