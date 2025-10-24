/**
 * Test Screen Module - Issue #29
 * Real-time question delivery and immediate grading
 */

export type TestState = {
  sessionId: string;
  currentQuestion: number;
  totalQuestions: number;
  answers: Array<{ questionId: string; score: number }>;
};

export function getNextQuestion(state: TestState) {
  return { questionId: `q${state.currentQuestion + 1}`, stem: "Sample question" };
}

export function submitAnswer(state: TestState, answer: string[]) {
  return { score: 0.8, feedback: "Good answer!" };
}
