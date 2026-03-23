# Database Models Documentation

This document provides comprehensive schema definitions for the database collections used in the Veritas AI Proctor system.

## Student Collection
**Schema:**
- **studentId**: String (unique identifier)
- **name**: String (full name of the student)
- **email**: String (email address)
- **enrollmentDate**: Date (date of enrollment)

## Admin Collection
**Schema:**
- **adminId**: String (unique identifier)
- **username**: String (admin username)
- **password**: String (hashed password)
- **roles**: Array of Strings (roles assigned to the admin)

## Test Collection
**Schema:**
- **testId**: String (unique identifier)
- **subject**: String (subject of the test)
- **date**: Date (date of the test)
- **duration**: Number (duration of the test in minutes)

## Question Collection
**Schema:**
- **questionId**: String (unique identifier)
- **testId**: String (the related test identifier)
- **content**: String (question text)
- **options**: Array of Strings (possible answer options)
- **correctAnswer**: String (correct answer identifier)

## Result Collection
**Schema:**
- **resultId**: String (unique identifier)
- **testId**: String (the related test identifier)
- **studentId**: String (the related student identifier)
- **score**: Number (score obtained by the student)
- **date**: Date (date when the result was generated)

## Exam Key Collection
**Schema:**
- **examKeyId**: String (unique identifier)
- **testId**: String (the related test identifier)
- **key**: String (unique exam key)
- **expirationDate**: Date (expiration date of the key)

## System Verification Log Collection
**Schema:**
- **logId**: String (unique identifier)
- **timestamp**: Date (when the verification occurred)
- **verificationType**: String (type of verification)
- **status**: String (status of verification)

## Behavior Analytics Collection
**Schema:**
- **analysisId**: String (unique identifier)
- **studentId**: String (the related student identifier)
- **behaviorData**: Object (data collected regarding behavior during tests)
- **date**: Date (date of behavior analysis)

---

This documentation is meant to provide clarity on the structure and relationships of data within the Veritas AI Proctor database.