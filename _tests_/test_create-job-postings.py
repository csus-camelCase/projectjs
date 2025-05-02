from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time

driver = webdriver.Chrome()

def test_create_job_posting():
    try:
        driver.get("http://localhost:3001/create-job-postings")
        time.sleep(2)  # Wait for page to load

        # Fill out the form
        driver.find_element(By.NAME, "title").send_keys("Software Engineer")
        driver.find_element(By.NAME, "description").send_keys("Develop and maintain software solutions.")
        driver.find_element(By.NAME, "requirements").send_keys("Python, JavaScript, SQL")
        driver.find_element(By.NAME, "client_name").send_keys("TechCorp")
        driver.find_element(By.NAME, "location").send_keys("New York, NY")
        driver.find_element(By.NAME, "job_type").send_keys("Full-time")
        
        # Submit the form
        driver.find_element(By.CLASS_NAME, "btn").click()
        time.sleep(2)  # Allow time for submission

        # Check for confirmation or redirection
        if "Job successfully added" in driver.page_source:
            print("Test case passed: Job posting created successfully.")
        else:
            print("Test case failed: Job posting creation failed.")
    except Exception as e:
        print(f"Test encountered an error: {e}")
    finally:
        driver.quit()

# Run the test
test_create_job_posting()