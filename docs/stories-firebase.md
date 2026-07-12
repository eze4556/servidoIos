# Historias (24 hs) — Firebase setup

## Índices compuestos (Firestore)

1. Collection `stories`: `isActive` Asc + `expiresAt` Asc  
2. Collection `stories`: `authorId` Asc + `createdAt` Asc (límite diario)

Si falla una query, usar el link de índice que sugiere Firebase.

## Reglas sugeridas (Firestore)

```
match /stories/{storyId} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.authorId == request.auth.uid
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "seller";
  allow update: if request.auth != null
    && resource.data.authorId == request.auth.uid
    || (
      request.resource.data.diff(resource.data).affectedKeys().hasOnly(["viewCount"])
      && request.resource.data.viewCount == resource.data.viewCount + 1
    );
  allow delete: if request.auth != null
    && resource.data.authorId == request.auth.uid;
}
```

## Storage

```
match /stories/{userId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```
