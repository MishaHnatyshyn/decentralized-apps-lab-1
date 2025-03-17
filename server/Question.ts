export class Question {
  private static QUESTIONS = [
    {
      text: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctOption: 2
    },
    {
      text: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctOption: 1
    },
    {
      text: "What is the largest mammal?",
      options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
      correctOption: 1
    },
    {
      text: "What is the largest organ in the human body?",
      options: ["Heart", "Liver", "Skin", "Lungs"],
      correctOption: 2
    },
    {
      text: "What is the largest ocean on Earth?",
      options: ["Atlantic", "Indian", "Arctic", "Pacific"],
      correctOption: 3
    },
  ];

  public static getQuestions() {
    return this.QUESTIONS;
  }
}
