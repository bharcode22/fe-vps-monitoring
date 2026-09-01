import { BACKEND_URL, getAuthHeaders } from './client';

/**
 * Fetch all configured RabbitMQ servers
 */
export async function fetchRabbitMqsApi() {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil data RabbitMQ');
  return data.data;
}

/**
 * Create a new RabbitMQ server connection
 */
export async function createRabbitMqApi(serverData) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(serverData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menambahkan server RabbitMQ');
  return data.data;
}

/**
 * Update an existing RabbitMQ server connection
 */
export async function updateRabbitMqApi(id, serverData) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(serverData)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal memperbarui server RabbitMQ');
  return data;
}

/**
 * Delete a RabbitMQ server connection
 */
export async function deleteRabbitMqApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal menghapus server RabbitMQ');
  return data;
}

/**
 * Fetch health & live queues/consumers from RabbitMQ HTTP API
 */
export async function fetchRabbitMqStatusApi(id) {
  const res = await fetch(`${BACKEND_URL}/api/rabbitmq/${id}/status`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Gagal mengambil live status RabbitMQ');
  return data.data;
}
