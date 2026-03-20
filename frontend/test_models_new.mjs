async function run() {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyB2dyWD3XkcpSvGosu1NRLsrMxEty8SRVM');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.log(e);
  }
}
run();
