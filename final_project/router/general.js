const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

const BASE_URL = "http://localhost:5000";

// ---------- Register ----------
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (users.some((u) => u.username === username)) {
    return res.status(409).json({ message: "User already exists!" });
  }
  users.push({ username, password });
  return res.status(200).json({ message: "User successfully registered. Now you can login" });
});

// ---------- Promise helpers ----------
const getAllBooks = () => new Promise((resolve) => resolve(books));

const getBookByISBN = (isbn) =>
  new Promise((resolve, reject) => {
    const book = books[isbn];
    book ? resolve(book) : reject({ status: 404, message: "Book not found" });
  });

const getBooksByField = (field, value) =>
  new Promise((resolve, reject) => {
    const result = Object.keys(books)
      .filter((key) => books[key][field].toLowerCase() === value.toLowerCase())
      .map((key) => ({ isbn: key, ...books[key] }));
    result.length
      ? resolve(result)
      : reject({ status: 404, message: `No books found for ${field}: ${value}` });
  });

// ---------- Main routes (promises) ----------
public_users.get("/", (req, res) => {
  getAllBooks().then((data) => res.status(200).send(JSON.stringify(data, null, 4)));
});

public_users.get("/isbn/:isbn", (req, res) => {
  getBookByISBN(req.params.isbn)
    .then((book) => res.status(200).json(book))
    .catch((err) => res.status(err.status).json({ message: err.message }));
});

public_users.get("/author/:author", (req, res) => {
  getBooksByField("author", req.params.author)
    .then((result) => res.status(200).json({ booksbyauthor: result }))
    .catch((err) => res.status(err.status).json({ message: err.message }));
});

public_users.get("/title/:title", (req, res) => {
  getBooksByField("title", req.params.title)
    .then((result) => res.status(200).json({ booksbytitle: result }))
    .catch((err) => res.status(err.status).json({ message: err.message }));
});

public_users.get("/review/:isbn", (req, res) => {
  getBookByISBN(req.params.isbn)
    .then((book) => res.status(200).json(book.reviews))
    .catch((err) => res.status(err.status).json({ message: err.message }));
});

// ---------- Axios clients (async/await + promise callbacks) ----------
// Retrieve all books with async/await + Axios
const fetchAllBooks = async () => {
  const response = await axios.get(`${BASE_URL}/`);
  return response.data;
};

// Retrieve by ISBN with Axios promise callbacks
const fetchBookByISBN = (isbn) =>
  axios.get(`${BASE_URL}/isbn/${isbn}`).then((response) => response.data);

// Retrieve by author with async/await + Axios
const fetchBooksByAuthor = async (author) => {
  const response = await axios.get(`${BASE_URL}/author/${encodeURIComponent(author)}`);
  return response.data;
};

// Retrieve by title with Axios promise callbacks
const fetchBooksByTitle = (title) =>
  axios.get(`${BASE_URL}/title/${encodeURIComponent(title)}`).then((response) => response.data);

public_users.get("/axios/books", async (req, res) => {
  try {
    res.status(200).json(await fetchAllBooks());
  } catch (e) {
    res.status(500).json({ message: "Error fetching books" });
  }
});

public_users.get("/axios/isbn/:isbn", (req, res) => {
  fetchBookByISBN(req.params.isbn)
    .then((data) => res.status(200).json(data))
    .catch(() => res.status(404).json({ message: "Book not found" }));
});

public_users.get("/axios/author/:author", async (req, res) => {
  try {
    res.status(200).json(await fetchBooksByAuthor(req.params.author));
  } catch (e) {
    res.status(404).json({ message: "No books found for that author" });
  }
});

public_users.get("/axios/title/:title", (req, res) => {
  fetchBooksByTitle(req.params.title)
    .then((data) => res.status(200).json(data))
    .catch(() => res.status(404).json({ message: "No books found for that title" }));
});

module.exports.general = public_users;
