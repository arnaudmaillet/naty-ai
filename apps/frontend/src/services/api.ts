export async function chatRequest(
  content: string,
  modelId: string,
  conversationId?: string,
) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
      modelId,
      conversationId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Une erreur est survenue');
  }

  return response.json();
}

export async function getConversations() {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/chat/conversations`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.json();
}

export async function getFullConversation(id: string) {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/chat/conversations/${id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.json();
}

export const getAvailableModels = async () => {
  const token = localStorage.getItem('token');

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/chat/models`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 401)
      console.error('Session expirée ou non autorisée');
    throw new Error('Erreur lors de la récupération des modèles');
  }

  return response.json();
};
