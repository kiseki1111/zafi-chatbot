const test = async () => {
  const res = await fetch("http://127.0.0.1:3005/api/v1/knowledge/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Info bulan",
      content: "mruah banget",
      tenantId: "t-123"
    })
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Data:", data);
};
test();
