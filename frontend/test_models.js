import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI('AIzaSyATh4YbbSBsH02XjBo1ajNLndIUDxRQi0w');
async function run() {
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];
  for (const name of models) {
    console.log('Testing', name);
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const res = await model.generateContent('hi');
      console.log('Success with', name);
      return;
    } catch(e) {
      console.log('Failed', name, e.message);
    }
  }
}
run();
