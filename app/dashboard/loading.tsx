export default function DashboardLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@900&display=swap"
        rel="stylesheet"
      />
      <style>{`@keyframes gymiq-pulse{0%,100%{opacity:0.25}50%{opacity:1}}`}</style>
      <div style={{ textAlign: "center", animation: "gymiq-pulse 2s ease-in-out infinite" }}>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 52,
            letterSpacing: 6,
            lineHeight: 1,
            color: "#FF5F1F",
          }}
        >
          GYM<span style={{ color: "#F5F5F5" }}>IQ</span>
        </div>
      </div>
    </div>
  );
}
