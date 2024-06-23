### Defination

Generics in TypeScript allow you to create reusable, flexible components that can work with a variety of types while
maintaining type safety. They enable you to define functions, classes, and interfaces that can operate with different
data types without sacrificing the benefit of type checking.

#### Simple Example

```typescript
function identity<T>(arg: T): T {
  return arg;
}

let output1 = identity<string>("Hello");
let output2 = identity<number>(123);
```

Identity function is a generic function. Which take type as Input. Here `<T>` is a generic type which define the types
Calling the identity function with `<type>` is define the type of function

### Start a brief example

#### Consider a scenario

Imagine we're building a library for managing collections of items. We want to support different types of items,
provide functionality for basic CRUD operations, and enable filtering items based on certain criteria.

#### briefly Explanation

Create two library one for `Books` another for `Movies`. Every book has id, name, description, author, pages and every movie have id, name, description, director, duration. Now create a Class with generic type class for CRUD Operation

#### Implementation

```typescript
// create a repository for crud operation for many type of items

// Both Book and Movie have a name and description

interface PrimaryParameter {
  id: number;
  name: string;
  description: string;
}

class Repository<T extends PrimaryParameter> {
  private items: T[] = [];

  // Added Item
  addItem(item: T): void {
    this.items.push(item);
  }

  // Get Single
  getSingle(id: number): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  // Get All
  getAll(): T[] {
    return this.items;
  }

  // Delete Item

  deleteItem(id: number): void {
    this.items.filter((item) => item.id !== id);
  }
}

interface Book extends PrimaryParameter {
  author: string;
  numberOfPage: number;
}

interface Movie extends PrimaryParameter {
  director: string;
  duration: number;
}

// Crete a book repository and movie repository
// Each repository have type of items
const bookRepository = new Repository<Book>();
const movieRepository = new Repository<Movie>();

bookRepository.addItem({
  id: 1,
  name: "TypeScript Handbook",
  description: "Comprehensive guide to TypeScript",
  author: "Microsoft",
  numberOfPage: 250,
});

bookRepository.addItem({
  id: 2,
  name: "JavaScript Handbook",
  description: "Comprehensive guide to JavaScript",
  author: "Microsoft",
  numberOfPage: 280,
});

bookRepository.addItem({
  id: 3,
  name: "Python Handbook",
  description: "Comprehensive guide to Python",
  author: "Microsoft",
  numberOfPage: 350,
});

movieRepository.addItem({
  id: 1,
  name: "Inception",
  description: "A mind-bending thriller",
  director: "Christopher Nolan",
  duration: 148,
});

movieRepository.addItem({
  id: 2,
  name: "Interstaller",
  description: "A mind-bending thriller",
  director: "Christopher Nolan",
  duration: 90,
});

movieRepository.addItem({
  id: 3,
  name: "Titanic",
  description: "A mind freshing drama",
  director: "James Cameroon",
  duration: 125,
});

const movieList = movieRepository.getAll();
console.log("Movie list ", movieList);
const singleMovie = movieRepository.getSingle(1);
console.log("Single Movie ", singleMovie);

const bookList = bookRepository.getAll();
console.log("Book list ", bookList);
const singleBook = bookRepository.getSingle(2);
console.log("Single book ", singleBook);

// delete single book book

bookRepository.deleteItem(1);

console.log(bookRepository.getAll);

// Filter functions

function filterItem<T>(items: T[], filterFunc: (item: T) => boolean) {
  return items.filter(filterFunc);
}

const filterBooks = filterItem(
  bookRepository.getAll(),
  (book) => book.numberOfPage > 200
);
console.log("Books which page is more then 200");

const filterMovies = filterItem(
  movieRepository.getAll(),
  (movie) => movie.duration > 100
);
console.log("Movie with duration 100 or more ", filterMovies);
```
