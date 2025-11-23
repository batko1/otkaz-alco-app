import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  // В Vite переменные окружения доступны через import.meta.env
  // Мы также оставляем безопасную проверку process.env на всякий случай
  const apiKey = import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : undefined);
  
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getSOSAdvice = async (
  cravingLevel: number,
  triggers: string[],
  mood: number
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Пожалуйста, настройте API ключ (VITE_API_KEY) для получения советов.";

  const prompt = `
    Ты — опытный психолог и наставник по борьбе с зависимостями.
    Пользователь сейчас испытывает тягу к алкоголю.
    
    Данные пользователя:
    - Уровень тяги (0-10): ${cravingLevel}
    - Настроение (0-10, где 0 плохо, 10 отлично): ${mood}
    - Триггеры (причины): ${triggers.length > 0 ? triggers.join(', ') : 'Не указаны'}
    
    Дай краткий, жесткий, но поддерживающий совет (максимум 3 предложения) о том, как прямо сейчас не сорваться. 
    Используй техники КПТ (когнитивно-поведенческой терапии) или техники заземления.
    Не используй маркированные списки. Говори как друг.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Держись! Сделай 10 глубоких вдохов. Это пройдет через 15 минут.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Сейчас сервер перегружен, но помни: ты сильнее этой тяги. Выпей стакан воды и прогуляйся.";
  }
};