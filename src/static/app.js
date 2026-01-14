document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select options to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Title and basic info
        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.appendChild(title);

        const desc = document.createElement("p");
        desc.textContent = details.description;
        activityCard.appendChild(desc);

        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;
        activityCard.appendChild(schedule);

        const availability = document.createElement("p");
        availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
        activityCard.appendChild(availability);

        // Participants section (show up to 5, then "+N more")
        const participantsWrap = document.createElement("div");
        participantsWrap.className = "participants";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants";
        participantsWrap.appendChild(participantsHeading);

        if (details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          const MAX_VISIBLE = 5;
          details.participants.slice(0, MAX_VISIBLE).forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";
            const emailSpan = document.createElement("span");
            emailSpan.className = "participant-email";
            emailSpan.textContent = p;
            li.appendChild(emailSpan);

            const removeBtn = document.createElement("button");
            removeBtn.className = "remove-participant";
            removeBtn.setAttribute("aria-label", `Remove ${p}`);
            removeBtn.textContent = "✖";

            removeBtn.addEventListener("click", async (e) => {
              e.stopPropagation();

              // Confirm before deleting
              const confirmed = window.confirm(`Remove ${p} from ${name}?`);
              if (!confirmed) return;

              try {
                const response = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );
                const result = await response.json();
                if (response.ok) {
                  // Show undo option
                  const undoId = `undo-${Date.now()}`;
                  messageDiv.innerHTML = `${result.message} <button id="${undoId}" class="undo-btn">Undo</button>`;
                  messageDiv.className = "info";
                  messageDiv.classList.remove("hidden");

                  // Setup undo handler (re-signup)
                  const undoBtn = document.getElementById(undoId);
                  const undoTimer = setTimeout(() => {
                    messageDiv.classList.add("hidden");
                  }, 5000);

                  undoBtn.addEventListener("click", async () => {
                    clearTimeout(undoTimer);
                    try {
                      const res2 = await fetch(
                        `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(p)}`,
                        { method: "POST" }
                      );
                      const r2json = await res2.json();
                      if (res2.ok) {
                        messageDiv.textContent = `Restored ${p}`;
                        messageDiv.className = "success";
                        fetchActivities();
                        setTimeout(() => messageDiv.classList.add("hidden"), 3000);
                      } else {
                        messageDiv.textContent = r2json.detail || "Failed to undo";
                        messageDiv.className = "error";
                        setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                      }
                    } catch (err) {
                      messageDiv.textContent = "Failed to undo. Please try again.";
                      messageDiv.className = "error";
                      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                      console.error("Error undoing participant removal:", err);
                    }
                  });

                  // Refresh activities to reflect change
                  fetchActivities();
                } else {
                  messageDiv.textContent = result.detail || "Failed to remove participant";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                }
              } catch (error) {
                messageDiv.textContent = "Failed to remove participant. Please try again.";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                console.error("Error removing participant:", error);
              }
            });

            li.appendChild(removeBtn);
            ul.appendChild(li);
          });
          if (details.participants.length > MAX_VISIBLE) {
            const moreLi = document.createElement("li");
            moreLi.className = "participants-more";
            moreLi.textContent = `+${details.participants.length - MAX_VISIBLE} more`;
            ul.appendChild(moreLi);
          }
          participantsWrap.appendChild(ul);
        } else {
          const noParticipants = document.createElement("p");
          noParticipants.className = "no-participants";
          noParticipants.textContent = "No participants yet";
          participantsWrap.appendChild(noParticipants);
        }

        activityCard.appendChild(participantsWrap);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so the new participant appears immediately
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
  fetchActivities();
});
