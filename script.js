const express = require("express");

const app = express();
const PORT = 3000;


app.use(express.json());

let students = [
  { id: 1, name: "Abhinandan", course: "CSE" },
  { id: 2, name: "Rahul", course: "ECE" },
  { id: 3, name: "Priya", course: "ISE" },
];

let nextId = 4;


app.get("/", (req, res) => {
  res.send("Welcome to the Student API! Use /students to view students.");
});


app.get("/students", (req, res) => {
  res.status(200).json({
    message: "All students retrieved successfully",
    data: students,
  });
});


app.get("/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  res.status(200).json({
    message: "Student retrieved successfully",
    data: student,
  });
});


app.post("/students", (req, res) => {
  const { name, course } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof course !== "string" ||
    !course.trim()
  ) {
    return res.status(400).json({
      message: "Please provide a valid name and course",
    });
  }

  const newStudent = {
    id: nextId++,
    name: name.trim(),
    course: course.trim(),
  };

  students.push(newStudent);

  res.status(201).json({
    message: "Student created successfully",
    data: newStudent,
  });
});


app.put("/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  const { name, course } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof course !== "string" ||
    !course.trim()
  ) {
    return res.status(400).json({
      message: "Please provide a valid name and course",
    });
  }

  student.name = name.trim();
  student.course = course.trim();

  res.status(200).json({
    message: "Student updated successfully",
    data: student,
  });
});


app.delete("/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = students.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  const deletedStudent = students.splice(index, 1)[0];

  res.status(200).json({
    message: "Student deleted successfully",
    data: deletedStudent,
  });
});


app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
