async function run() {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyATh4YbbSBsH02XjBo1ajNLndIUDxRQi0w');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.log(e);
  }
}
run();
