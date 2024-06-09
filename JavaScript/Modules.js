// ! Js Modules => export and import in js

/*
 * JavaScript allows you to break the code into multiple parts and merge them together in one file.
 *
 * JavaScript has two types of imports and two types of exports:
 * - Named exports/imports
 * - Default import and export
 */

// * Named Export:-
// * In-line individually export
export const name = "Riyad";
export const lastName = "Karim";

// * All export together at the bottom of the file
let x = 5,
  y = 6;
export { x, y };

// * Default export => one file can only have one default export
let abc = 123;
export default abc;

// ? import

/*
 * Importing a file depends on how a file is exported.
 */

// * Named imported
import { x, y } from "./Modules";

// * default imported
import abc from "./Modules";
