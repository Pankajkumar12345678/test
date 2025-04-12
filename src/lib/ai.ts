import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "langchain/schema";
import { useAppStore } from "@/store/store";
import { systemMessage } from "./utils";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";

export const getCodeReview = async () => {
  const { code, setModelAnswer, selectedLanguage } = useAppStore.getState();

  setModelAnswer("Analyzing...");
  try {
    const apiKey = process.env.OPENAI_API_KEY; // Use sk- personal key

    const guardPromptText = `Return 1 if this is valid ${selectedLanguage} code, otherwise return 0:\n\n{code}`;
    const prompt = PromptTemplate.fromTemplate(guardPromptText);

    const guard = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      openAIApiKey: apiKey,
      temperature: 0.2,
    });

    const guardChain = new LLMChain({ llm: guard, prompt });
    const guardResult = await guardChain.call({ code });

    const isValidCode = guardResult?.text.trim() === "1";

    if (!isValidCode) {
      setModelAnswer("❌ Invalid code snippet or not valid " + selectedLanguage + " code.");
      return;
    }

    const reviewer = new ChatOpenAI({
      modelName: "gpt-4",
      openAIApiKey: apiKey,
      temperature: 0.5,
      streaming: true,
    });

    await reviewer.invoke(
      [new SystemMessage(systemMessage), new HumanMessage(code)],
      {
        callbacks: [
          {
            handleLLMNewToken(token: string) {
              setModelAnswer(prev => prev + token);
            },
          },
        ],
      }
    );
  } catch (error: any) {
    console.error("Error during code review:", error);
    setModelAnswer(`❗ Error: ${error.message}`);
  }
};
