document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginToggle = document.getElementById("login-toggle");
  const loginPanel = document.getElementById("login-panel");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const authStatus = document.getElementById("auth-status");

  let authState = {
    username: "",
    password: "",
    isAuthenticated: false,
  };

  function buildAuthHeader() {
    if (!authState.isAuthenticated) {
      return {};
    }

    const token = btoa(`${authState.username}:${authState.password}`);
    return {
      Authorization: `Basic ${token}`,
    };
  }

  function setAuthStatus(message, className = "info") {
    authStatus.textContent = message;
    authStatus.className = className;
  }

  function requireAuthenticationMessage() {
    messageDiv.textContent = "Teacher login required to modify registrations.";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
  }

  function updateAuthUI() {
    if (authState.isAuthenticated) {
      setAuthStatus(`Signed in as ${authState.username}`, "success");
      logoutBtn.classList.remove("hidden");
      loginForm.classList.add("hidden");
      loginToggle.textContent = "Teacher Account";
    } else {
      setAuthStatus("Not signed in", "info");
      logoutBtn.classList.add("hidden");
      loginForm.classList.remove("hidden");
      loginToggle.textContent = "Teacher Login";
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!authState.isAuthenticated) {
      requireAuthenticationMessage();
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: buildAuthHeader(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  loginToggle.addEventListener("click", () => {
    loginPanel.classList.toggle("hidden");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    const token = btoa(`${username}:${password}`);

    try {
      const response = await fetch("/auth/me", {
        headers: {
          Authorization: `Basic ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      authState = {
        username,
        password,
        isAuthenticated: true,
      };
      updateAuthUI();
      messageDiv.textContent = "Teacher login successful.";
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
    } catch (error) {
      authState = {
        username: "",
        password: "",
        isAuthenticated: false,
      };
      updateAuthUI();
      messageDiv.textContent = "Teacher login failed.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  });

  logoutBtn.addEventListener("click", () => {
    authState = {
      username: "",
      password: "",
      isAuthenticated: false,
    };
    updateAuthUI();
    loginForm.reset();
    messageDiv.textContent = "Signed out.";
    messageDiv.className = "info";
    messageDiv.classList.remove("hidden");
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authState.isAuthenticated) {
      requireAuthenticationMessage();
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: buildAuthHeader(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
