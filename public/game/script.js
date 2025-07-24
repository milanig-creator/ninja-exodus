// grab elements
const select = document.getElementById('command-select');
const goBtn  = document.getElementById('go-btn');

// when the dropdown value changes...
select.addEventListener('change', () => {
  if (select.value) {
    goBtn.textContent = 'Proceed';  // set button text
    goBtn.disabled   = false;       // enable it
  } else {
    goBtn.textContent = '';         // clear text
    goBtn.disabled   = true;        // keep disabled
  }
});

// when you click "Proceed"...
goBtn.addEventListener('click', () => {
  const idx = select.selectedIndex;
  if (idx <= 0) return;  // nothing chosen

  const url = select.options[idx].dataset.url;
  if (url) {
    window.location.href = url;  // navigate
  }
});
