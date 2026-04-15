export async function chatRequest(content: string, modelId: string, conversationId?: string) {
  // Récupère le token stocké (on part du principe qu'il est dans le localStorage après login)
  const token = localStorage.getItem('token'); 

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content,
      modelId,
      conversationId
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Une erreur est survenue');
  }

  return response.json();
}

// apps/frontend/src/services/api.ts

export async function getConversations() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/conversations`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

export async function getFullConversation(id: string) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/conversations/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}