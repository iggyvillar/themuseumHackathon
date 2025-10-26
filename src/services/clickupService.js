const axios = require('axios');

class ClickUpService {
  constructor(apiKey, listId) {
    this.apiKey = apiKey;
    this.listId = listId;
    this.baseUrl = 'https://api.clickup.com/api/v2';
  }

  /**
   * Create headers for ClickUp API requests
   */
  getHeaders() {
    return {
      'Authorization': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create a task in ClickUp
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task response
   */
  async createTask(taskData) {
    try {
      const {
        title,
        description,
        priority,
        assignee,
        dueDate,
        tags = [],
        customFields = {}
      } = taskData;

      // Map priority to ClickUp priority values (1 = urgent, 2 = high, 3 = normal, 4 = low)
      const priorityMap = {
        'urgent': 1,
        'high': 2,
        'medium': 3,
        'low': 4
      };

      const payload = {
        name: title,
        description: description,
        priority: priorityMap[priority] || 3,
        tags: tags,
      };

      // Add optional fields
      if (assignee) {
        payload.assignees = [assignee];
      }

      if (dueDate) {
        payload.due_date = new Date(dueDate).getTime();
      }

      console.log(`Creating task in ClickUp list: ${this.listId}`);
      
      const response = await axios.post(
        `${this.baseUrl}/list/${this.listId}/task`,
        payload,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Task created in ClickUp: ${response.data.id}`);

      return {
        success: true,
        taskId: response.data.id,
        url: response.data.url,
        data: response.data
      };

    } catch (error) {
      console.error('Error creating ClickUp task:', error.response?.data || error.message);
      throw new Error(error.response?.data?.err || error.message);
    }
  }

  /**
   * Update a task in ClickUp
   * @param {string} taskId - ClickUp task ID
   * @param {Object} updates - Task updates
   * @returns {Promise<Object>} Updated task response
   */
  async updateTask(taskId, updates) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/task/${taskId}`,
        updates,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Task updated in ClickUp: ${taskId}`);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Error updating ClickUp task:', error.response?.data || error.message);
      throw new Error(error.response?.data?.err || error.message);
    }
  }

  /**
   * Get a task from ClickUp
   * @param {string} taskId - ClickUp task ID
   * @returns {Promise<Object>} Task data
   */
  async getTask(taskId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/task/${taskId}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Error getting ClickUp task:', error.response?.data || error.message);
      throw new Error(error.response?.data?.err || error.message);
    }
  }

  /**
   * Delete a task from ClickUp
   * @param {string} taskId - ClickUp task ID
   * @returns {Promise<Object>} Deletion response
   */
  async deleteTask(taskId) {
    try {
      await axios.delete(
        `${this.baseUrl}/task/${taskId}`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ Task deleted from ClickUp: ${taskId}`);

      return {
        success: true,
        message: 'Task deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting ClickUp task:', error.response?.data || error.message);
      throw new Error(error.response?.data?.err || error.message);
    }
  }

  /**
   * Create a task comment in ClickUp
   * @param {string} taskId - ClickUp task ID
   * @param {string} comment - Comment text
   * @returns {Promise<Object>} Comment response
   */
  async addComment(taskId, comment) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/task/${taskId}/comment`,
        {
          comment_text: comment
        },
        { headers: this.getHeaders() }
      );

      console.log(`✅ Comment added to ClickUp task: ${taskId}`);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Error adding ClickUp comment:', error.response?.data || error.message);
      throw new Error(error.response?.data?.err || error.message);
    }
  }

  /**
   * Get list information from ClickUp
   * @returns {Promise<Object>} List data
   */
  async getList() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/list/${this.listId}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Error getting ClickUp list:', error.response?.data || error.message);
      throw new Error(error.response?.data?.err || error.message);
    }
  }
}

module.exports = ClickUpService;

