// Package auth contains the authentication boundary for the backend.
//
// Current status:
// - middleware skeleton is implemented
// - request auth context is implemented
// - verifier is still abstract and ready for Firebase Admin integration
//
// Next step:
// - add a Firebase-backed Verifier implementation
// - wire protected routes such as GET /api/me
package auth
