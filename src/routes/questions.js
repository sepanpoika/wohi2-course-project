const express = require("express");
const router = express.Router();
const questions = require("../data/questions");

// GET /api/questions 
// list all questions OR search by keyword 
router.get("/", (req, res) => {
  const { keyword } = req.query; 

  // if there isn't a keyword we return all the questions
  if (!keyword) {
    return res.json(questions);
  }

  // filter questions where question text includes the keyword 
  const filteredQuestions = questions.filter(q =>
    q.question.toLowerCase().includes(keyword.toLowerCase())
  );

  res.json(filteredQuestions); // return the filtered list
});

// GET /api/questions/:qId
// return specific question based on ID 
router.get("/:qId", (req, res) => {
  // get ID from URL and convert to number
  const qId = Number(req.params.qId);
  
  // search for the question with the correct ID 
  const question = questions.find((q) => q.id === qId);

  // return 404 if the question is not found
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  // return the found question 
  res.json(question);
});

// POST /api/questions
// create a new question 
router.post("/", (req, res) => {
  // get question and answer 
  const { question, answer } = req.body;

  // check if both fields exist
  if (!question || !answer) {
    return res.status(400).json({
      message: "Both question and answer are required" 
    });
  }

  // calculate next ID 
  const maxId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) : 0;
  
  const newQuestion = {
    id: maxId + 1,
    question,
    answer
  };

  // add new question to our data list 
  questions.push(newQuestion);
  
  // return new question 
  res.status(201).json(newQuestion);
});

// PUT /api/questions/:qId
// edit an existing question
router.put("/:qId", (req, res) => {
  const qId = Number(req.params.qId);
  const { question, answer } = req.body;

  // find the question we want to change
  const targetQuestion = questions.find((q) => q.id === qId);

  if (!targetQuestion) {
    return res.status(404).json({ message: "Question not found" }); 
  }

  // check if the new data is correct
  if (!question || !answer) {
    return res.status(400).json({ message: "Both question and answer are required" }); 
  }

  // update the question and answer
  targetQuestion.question = question;
  targetQuestion.answer = answer;

  res.json(targetQuestion); // return the updated question 
});

// DELETE /api/questions/:qId
// delete a question 
router.delete("/:qId", (req, res) => {
  const qId = Number(req.params.qId);
  
  // find the index 
  const questionIndex = questions.findIndex((q) => q.id === qId);

  if (questionIndex === -1) {
    return res.status(404).json({ message: "Question not found" }); 
  }

  // remove the question from the list
  const deletedQuestion = questions.splice(questionIndex, 1);
  
  // return success message and the deleted question 
  res.json({
    message: "Question deleted successfully",
    question: deletedQuestion[0]
  });
});

module.exports = router;