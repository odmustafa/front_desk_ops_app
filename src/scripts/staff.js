/**
 * Front Desk Ops Application - Staff Management Module
 * Handles staff scheduling, tasks, and directory
 */

// DOM Elements
const staffSchedule = document.getElementById('staff-schedule');
const taskList = document.getElementById('task-list');
const addTaskBtn = document.getElementById('add-task-btn');
const staffDirectory = document.getElementById('staff-directory');

// Staff management state
const staffState = {
  tasks: [],
  schedule: [],
  staff: []
};

// Initialize the staff module
document.addEventListener('DOMContentLoaded', () => {
  // Set up event listeners
  setupStaffEventListeners();
});

/**
 * Set up event listeners for the staff page
 */
function setupStaffEventListeners() {
  // Add task button
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', handleAddTask);
  }
}

/**
 * Load staff data from database
 */
function loadStaffData() {
  // Load tasks
  loadTasks();
  
  // Load schedule
  loadSchedule();
  
  // Load staff directory
  loadStaffDirectory();
}

/**
 * Load tasks from database
 */
async function loadTasks() {
  try {
    // In a real implementation, this would fetch data from the database
    // For now, we'll use placeholder data
    
    // Simulate API call
    const tasks = await simulateTasksData();
    
    // Store the tasks in the state
    staffState.tasks = tasks;
    
    // Display tasks
    displayTasks(tasks);
    
  } catch (error) {
    console.error('Error loading tasks:', error);
    window.app.showAlert('Error', 'Failed to load tasks. Please try again.');
  }
}

/**
 * Simulate tasks data (for development purposes)
 * @returns {Promise} - Resolves with simulated tasks data
 */
function simulateTasksData() {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // Simulate tasks data
      const tasks = [
        {
          id: 'task1',
          title: 'Restock merchandise',
          description: 'Restock t-shirts and other merchandise in the display case',
          assignedTo: 'John Smith',
          dueDate: '2025-04-20',
          priority: 'high',
          completed: false
        },
        {
          id: 'task2',
          title: 'Update member directory',
          description: 'Add new members from last week to the printed directory',
          assignedTo: 'Jane Doe',
          dueDate: '2025-04-21',
          priority: 'medium',
          completed: false
        },
        {
          id: 'task3',
          title: 'Clean sound equipment',
          description: 'Clean and organize sound equipment in the storage room',
          assignedTo: 'Mike Johnson',
          dueDate: '2025-04-22',
          priority: 'low',
          completed: true
        }
      ];
      
      resolve(tasks);
    }, 500);
  });
}

/**
 * Display tasks in the UI
 * @param {Array} tasks - The tasks to display
 */
function displayTasks(tasks) {
  // Check if task list element exists
  if (!taskList) return;
  
  // Clear the list
  taskList.innerHTML = '';
  
  if (tasks.length === 0) {
    taskList.innerHTML = '<p class="text-center text-muted">No tasks available</p>';
    return;
  }
  
  // Create task items
  tasks.forEach(task => {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item card mb-2';
    taskItem.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="card-title mb-0 ${task.completed ? 'text-muted text-decoration-line-through' : ''}">${task.title}</h6>
          <span class="badge ${getPriorityBadgeClass(task.priority)}">${task.priority}</span>
        </div>
        <p class="card-text small mt-2 ${task.completed ? 'text-muted' : ''}">${task.description}</p>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <small class="text-muted">Assigned to: ${task.assignedTo}</small>
          <small class="text-muted">Due: ${formatDate(task.dueDate)}</small>
        </div>
        <div class="mt-2">
          <div class="form-check">
            <input class="form-check-input task-complete-checkbox" type="checkbox" value="" id="task-${task.id}" ${task.completed ? 'checked' : ''}>
            <label class="form-check-label" for="task-${task.id}">
              Mark as complete
            </label>
          </div>
        </div>
      </div>
    `;
    
    // Add event listener for checkbox
    const checkbox = taskItem.querySelector('.task-complete-checkbox');
    checkbox.addEventListener('change', () => {
      toggleTaskCompletion(task.id);
    });
    
    taskList.appendChild(taskItem);
  });
}

/**
 * Get the appropriate badge class for a task priority
 * @param {string} priority - The priority level (high, medium, low)
 * @returns {string} - The badge class
 */
function getPriorityBadgeClass(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-danger';
    case 'medium':
      return 'bg-warning text-dark';
    case 'low':
      return 'bg-info text-dark';
    default:
      return 'bg-secondary';
  }
}

/**
 * Toggle task completion status
 * @param {string} taskId - The ID of the task to toggle
 */
function toggleTaskCompletion(taskId) {
  // Find the task in the state
  const taskIndex = staffState.tasks.findIndex(task => task.id === taskId);
  
  if (taskIndex !== -1) {
    // Toggle completion status
    staffState.tasks[taskIndex].completed = !staffState.tasks[taskIndex].completed;
    
    // Update the UI
    displayTasks(staffState.tasks);
    
    // In a real implementation, this would update the database
    console.log(`Task ${taskId} completion toggled to ${staffState.tasks[taskIndex].completed}`);
  }
}

/**
 * Handle adding a new task
 */
function handleAddTask() {
  // Create a form for adding a new task
  const formHtml = `
    <form id="add-task-form">
      <div class="form-group">
        <label for="task-title">Title</label>
        <input type="text" class="form-control" id="task-title" required>
      </div>
      <div class="form-group mt-2">
        <label for="task-description">Description</label>
        <textarea class="form-control" id="task-description" rows="3" required></textarea>
      </div>
      <div class="row mt-2">
        <div class="col-md-6">
          <div class="form-group">
            <label for="task-assigned">Assigned To</label>
            <input type="text" class="form-control" id="task-assigned" required>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label for="task-due-date">Due Date</label>
            <input type="date" class="form-control" id="task-due-date" required>
          </div>
        </div>
      </div>
      <div class="form-group mt-2">
        <label for="task-priority">Priority</label>
        <select class="form-control" id="task-priority" required>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
    </form>
  `;
  
  // Show the form in a modal
  window.app.showConfirmDialog(
    'Add New Task',
    formHtml,
    () => {
      // Get form values
      const title = document.getElementById('task-title').value;
      const description = document.getElementById('task-description').value;
      const assignedTo = document.getElementById('task-assigned').value;
      const dueDate = document.getElementById('task-due-date').value;
      const priority = document.getElementById('task-priority').value;
      
      // Create new task
      const newTask = {
        id: `task${Date.now()}`,
        title,
        description,
        assignedTo,
        dueDate,
        priority,
        completed: false
      };
      
      // Add task to state
      staffState.tasks.push(newTask);
      
      // Update the UI
      displayTasks(staffState.tasks);
      
      // In a real implementation, this would save to the database
      console.log('New task added:', newTask);
    }
  );
  
  // Set default due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
  
  setTimeout(() => {
    const dueDateInput = document.getElementById('task-due-date');
    if (dueDateInput) {
      dueDateInput.value = tomorrowFormatted;
    }
  }, 100);
}

/**
 * Load staff schedule from database
 */
async function loadSchedule() {
  try {
    // In a real implementation, this would fetch data from the database
    // For now, we'll use placeholder data
    
    // Simulate API call
    const schedule = await simulateScheduleData();
    
    // Store the schedule in the state
    staffState.schedule = schedule;
    
    // Display schedule
    displaySchedule(schedule);
    
  } catch (error) {
    console.error('Error loading schedule:', error);
    window.app.showAlert('Error', 'Failed to load schedule. Please try again.');
  }
}

/**
 * Simulate schedule data (for development purposes)
 * @returns {Promise} - Resolves with simulated schedule data
 */
function simulateScheduleData() {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // Actual schedule data from Tribute Music Gallery
      const schedule = [
        // Monday
        {
          id: 'mon-day',
          day: 'Monday',
          shift: 'Day',
          time: '10:00 AM - 10:00 PM',
          register: '#open',
          rover: 'Omar'
        },
        {
          id: 'mon-night',
          day: 'Monday',
          shift: 'Night',
          time: '10:00 PM - 10:00 AM',
          register: 'Kendee',
          rover: 'Brandon'
        },
        // Tuesday
        {
          id: 'tue-day',
          day: 'Tuesday',
          shift: 'Day',
          time: '10:00 AM - 10:00 PM',
          register: '#open',
          rover: 'Omar'
        },
        {
          id: 'tue-night',
          day: 'Tuesday',
          shift: 'Night',
          time: '10:00 PM - 10:00 AM',
          register: 'Kendee',
          rover: 'Brandon'
        },
        // Wednesday
        {
          id: 'wed-day',
          day: 'Wednesday',
          shift: 'Day',
          time: '10:00 AM - 10:00 PM',
          register: '#open',
          rover: 'Omar'
        },
        {
          id: 'wed-night',
          day: 'Wednesday',
          shift: 'Night',
          time: '10:00 PM - 10:00 AM',
          register: 'Kendee',
          rover: 'Brandon'
        },
        // Thursday
        {
          id: 'thu-day',
          day: 'Thursday',
          shift: 'Day',
          time: '10:00 AM - 10:00 PM',
          register: '#open',
          rover: 'Joe'
        },
        {
          id: 'thu-night',
          day: 'Thursday',
          shift: 'Night',
          time: '10:00 PM - 10:00 AM',
          register: 'Kendee',
          rover: 'Brandon'
        },
        // Friday
        {
          id: 'fri-day',
          day: 'Friday',
          shift: 'Day',
          time: '10:00 AM - 10:00 PM',
          register: '#open',
          rover: 'Joe'
        },
        {
          id: 'fri-night',
          day: 'Friday',
          shift: 'Night',
          time: '10:00 PM - 10:00 AM',
          register: 'Kendee',
          rover: 'Will'
        },
        // Saturday
        {
          id: 'sat-day',
          day: 'Saturday',
          shift: 'Day',
          time: '10:00 AM - 10:00 PM',
          register: '#open',
          rover: 'Joe'
        },
        {
          id: 'sat-night',
          day: 'Saturday',
          shift: 'Night',
          time: '10:00 PM - 10:00 AM',
          register: 'Kendee',
          rover: 'Brandon'
        },
        // Sunday
        {
          id: 'sun-day',
          day: 'Sunday',
          shift: 'Day',
          time: '10:00 AM - 10:00 PM',
          register: 'Rachel',
          rover: 'Will'
        },
        {
          id: 'sun-night',
          day: 'Sunday',
          shift: 'Night',
          time: '10:00 PM - 10:00 AM',
          register: 'Liz',
          rover: 'Paul'
        }
      ];
      
      resolve(schedule);
    }, 500);
  });
}

/**
 * Display schedule in the UI
 * @param {Array} schedule - The schedule to display
 */
function displaySchedule(schedule) {
  // Check if schedule element exists
  if (!staffSchedule) return;
  
  // Clear the container
  staffSchedule.innerHTML = '';
  
  if (schedule.length === 0) {
    staffSchedule.innerHTML = '<p class="text-center text-muted">No schedule available</p>';
    return;
  }
  
  // Create schedule table
  const table = document.createElement('table');
  table.className = 'table table-bordered table-striped';
  
  // Create table header
  const thead = document.createElement('thead');
  thead.className = 'table-dark';
  
  // Add header row with day and shift type
  const headerRow1 = document.createElement('tr');
  headerRow1.innerHTML = `
    <th>Day</th>
    <th>Shift</th>
    <th>Register</th>
    <th>Rover</th>
  `;
  thead.appendChild(headerRow1);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  // Group schedule by day
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayShifts = {};
  
  days.forEach(day => {
    dayShifts[day] = {
      day: day,
      shifts: []
    };
  });
  
  // Organize shifts by day
  schedule.forEach(shift => {
    if (dayShifts[shift.day]) {
      dayShifts[shift.day].shifts.push(shift);
    }
  });
  
  // Create rows for each day and shift
  days.forEach(day => {
    const dayData = dayShifts[day];
    const dayShifts = dayData.shifts.sort((a, b) => {
      // Sort by shift (Day first, then Night)
      return a.shift === 'Day' ? -1 : 1;
    });
    
    // If no shifts for this day, add empty row
    if (dayShifts.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td>${day}</td>
        <td colspan="3" class="text-center text-muted">No shifts scheduled</td>
      `;
      tbody.appendChild(emptyRow);
      return;
    }
    
    // Add rows for each shift
    dayShifts.forEach((shift, index) => {
      const row = document.createElement('tr');
      
      // Highlight current day
      const today = new Date();
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
      if (day === dayOfWeek) {
        row.className = 'table-primary';
      }
      
      // For first shift of the day, show the day name
      if (index === 0) {
        row.innerHTML = `
          <td rowspan="${dayShifts.length}">${day}</td>
          <td>${shift.shift}</td>
          <td>${shift.register}</td>
          <td>${shift.rover}</td>
        `;
      } else {
        row.innerHTML = `
          <td>${shift.shift}</td>
          <td>${shift.register}</td>
          <td>${shift.rover}</td>
        `;
      }
      
      tbody.appendChild(row);
    });
  });
  
  table.appendChild(tbody);
  
  // Add shift hours information
  const shiftInfo = document.createElement('div');
  shiftInfo.className = 'mt-3 card';
  shiftInfo.innerHTML = `
    <div class="card-header bg-dark text-white">Shift Hours</div>
    <div class="card-body">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Shift</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Day shift</td>
            <td>10AM to 10PM</td>
          </tr>
          <tr>
            <td>Night shift</td>
            <td>10PM to 10AM</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  
  // Add pay scale information
  const payInfo = document.createElement('div');
  payInfo.className = 'mt-3 card';
  payInfo.innerHTML = `
    <div class="card-header bg-dark text-white">Pay Scale</div>
    <div class="card-body">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Total Shifts (per week)</th>
            <th>Pay (per shift)</th>
            <th>Total Pay (per week)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>2</td>
            <td>$75</td>
            <td>$150</td>
          </tr>
          <tr>
            <td>3</td>
            <td>$75</td>
            <td>$225</td>
          </tr>
          <tr>
            <td>4</td>
            <td>$75</td>
            <td>$300</td>
          </tr>
          <tr>
            <td>5</td>
            <td>$80</td>
            <td>$400</td>
          </tr>
          <tr>
            <td>6</td>
            <td>$83</td>
            <td>$500</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  
  staffSchedule.appendChild(table);
  staffSchedule.appendChild(shiftInfo);
  staffSchedule.appendChild(payInfo);
}

/**
 * Get the name of a day from its index
 * @param {number} dayIndex - The day index (0-6, where 0 is Sunday)
 * @returns {string} - The name of the day
 */
function getDayName(dayIndex) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
}

/**
 * Load staff directory from database
 */
async function loadStaffDirectory() {
  try {
    // In a real implementation, this would fetch data from the database
    // For now, we'll use placeholder data
    
    // Simulate API call
    const staff = await simulateStaffData();
    
    // Store the staff in the state
    staffState.staff = staff;
    
    // Display staff directory
    displayStaffDirectory(staff);
    
  } catch (error) {
    console.error('Error loading staff directory:', error);
    window.app.showAlert('Error', 'Failed to load staff directory. Please try again.');
  }
}

/**
 * Simulate staff data (for development purposes)
 * @returns {Promise} - Resolves with simulated staff data
 */
function simulateStaffData() {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // Actual staff data from Tribute Music Gallery
      const staff = [
        {
          id: 'staff1',
          name: 'Kendee',
          position: 'Front Desk Staff',
          contact: 'kendee@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 6,
          payRate: '$83'
        },
        {
          id: 'staff2',
          name: 'Molly',
          position: 'Front Desk Staff',
          contact: 'molly@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 0,
          payRate: '$75'
        },
        {
          id: 'staff3',
          name: 'Rachel',
          position: 'Front Desk Staff',
          contact: 'rachel@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 1,
          payRate: '$75'
        },
        {
          id: 'staff4',
          name: 'Liz',
          position: 'Front Desk Staff',
          contact: 'liz@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 1,
          payRate: '$75'
        },
        {
          id: 'staff5',
          name: 'Omar',
          position: 'Front Desk Staff',
          contact: 'omar@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 3,
          payRate: '$75'
        },
        {
          id: 'staff6',
          name: 'Brandon',
          position: 'Front Desk Staff',
          contact: 'brandon@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 5,
          payRate: '$80'
        },
        {
          id: 'staff7',
          name: 'Joe',
          position: 'Front Desk Staff',
          contact: 'joe@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 3,
          payRate: '$75'
        },
        {
          id: 'staff8',
          name: 'Will',
          position: 'Front Desk Staff',
          contact: 'will@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 2,
          payRate: '$75'
        },
        {
          id: 'staff9',
          name: 'Paul',
          position: 'Front Desk Staff',
          contact: 'paul@tributemusicgallery.com',
          phone: '',
          status: 'Active',
          shifts: 1,
          payRate: '$75'
        }
      ];
      
      resolve(staff);
    }, 500);
  });
}

/**
 * Display staff directory in the UI
 * @param {Array} staff - The staff to display
 */
function displayStaffDirectory(staff) {
  // Check if staff directory element exists
  if (!staffDirectory) return;
  
  // Clear the table
  staffDirectory.innerHTML = '';
  
  if (staff.length === 0) {
    staffDirectory.innerHTML = '<tr><td colspan="5" class="text-center">No staff members available</td></tr>';
    return;
  }
  
  // Create staff rows
  staff.forEach(member => {
    const row = document.createElement('tr');
    
    // Set row content
    row.innerHTML = `
      <td>${member.name}</td>
      <td>${member.position}</td>
      <td>
        <div>${member.contact}</div>
        <div>${member.phone}</div>
      </td>
      <td>
        <span class="badge ${member.status === 'Active' ? 'bg-success' : 'bg-warning text-dark'}">${member.status}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary view-staff-btn" data-staff-id="${member.id}">
          <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary edit-staff-btn" data-staff-id="${member.id}">
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    `;
    
    // Add event listeners for buttons
    row.querySelector('.view-staff-btn').addEventListener('click', () => {
      viewStaffMember(member.id);
    });
    
    row.querySelector('.edit-staff-btn').addEventListener('click', () => {
      editStaffMember(member.id);
    });
    
    staffDirectory.appendChild(row);
  });
}

/**
 * View a staff member's details
 * @param {string} staffId - The ID of the staff member to view
 */
function viewStaffMember(staffId) {
  // Find the staff member in the state
  const member = staffState.staff.find(staff => staff.id === staffId);
  
  if (member) {
    // Show staff details in a modal
    const detailsHtml = `
      <div class="text-center mb-3">
        <img src="../assets/placeholder-profile.svg" alt="${member.name}" class="staff-photo-large">
        <h5 class="mt-2">${member.name}</h5>
        <span class="badge ${member.status === 'Active' ? 'bg-success' : 'bg-warning text-dark'}">${member.status}</span>
      </div>
      <div class="staff-details">
        <div class="row mb-2">
          <div class="col-4 fw-bold">Position:</div>
          <div class="col-8">${member.position}</div>
        </div>
        <div class="row mb-2">
          <div class="col-4 fw-bold">Email:</div>
          <div class="col-8">${member.contact}</div>
        </div>
        <div class="row mb-2">
          <div class="col-4 fw-bold">Phone:</div>
          <div class="col-8">${member.phone}</div>
        </div>
      </div>
    `;
    
    window.app.showAlert(
      'Staff Details',
      detailsHtml
    );
  }
}

/**
 * Edit a staff member's details
 * @param {string} staffId - The ID of the staff member to edit
 */
function editStaffMember(staffId) {
  // Find the staff member in the state
  const member = staffState.staff.find(staff => staff.id === staffId);
  
  if (member) {
    // Create a form for editing the staff member
    const formHtml = `
      <form id="edit-staff-form">
        <div class="form-group">
          <label for="staff-name">Name</label>
          <input type="text" class="form-control" id="staff-name" value="${member.name}" required>
        </div>
        <div class="form-group mt-2">
          <label for="staff-position">Position</label>
          <input type="text" class="form-control" id="staff-position" value="${member.position}" required>
        </div>
        <div class="form-group mt-2">
          <label for="staff-email">Email</label>
          <input type="email" class="form-control" id="staff-email" value="${member.contact}" required>
        </div>
        <div class="form-group mt-2">
          <label for="staff-phone">Phone</label>
          <input type="text" class="form-control" id="staff-phone" value="${member.phone}" required>
        </div>
        <div class="form-group mt-2">
          <label for="staff-status">Status</label>
          <select class="form-control" id="staff-status" required>
            <option value="Active" ${member.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="On Leave" ${member.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
            <option value="Inactive" ${member.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
      </form>
    `;
    
    // Show the form in a modal
    window.app.showConfirmDialog(
      'Edit Staff Member',
      formHtml,
      () => {
        // Get form values
        const name = document.getElementById('staff-name').value;
        const position = document.getElementById('staff-position').value;
        const contact = document.getElementById('staff-email').value;
        const phone = document.getElementById('staff-phone').value;
        const status = document.getElementById('staff-status').value;
        
        // Update staff member in state
        const staffIndex = staffState.staff.findIndex(staff => staff.id === staffId);
        if (staffIndex !== -1) {
          staffState.staff[staffIndex] = {
            ...staffState.staff[staffIndex],
            name,
            position,
            contact,
            phone,
            status
          };
          
          // Update the UI
          displayStaffDirectory(staffState.staff);
          
          // In a real implementation, this would update the database
          console.log('Staff member updated:', staffState.staff[staffIndex]);
        }
      }
    );
  }
}

/**
 * Format a date string to a more readable format
 * @param {string} dateString - The date string to format (YYYY-MM-DD)
 * @returns {string} - The formatted date string (MM/DD/YYYY)
 */
function formatDate(dateString) {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}
