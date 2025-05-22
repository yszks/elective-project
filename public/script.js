function showForm(formId) {
    document.querySelectorAll('.form-box').forEach(box => {
        box.classList.remove('active');
    });
    document.getElementById(formId).classList.add('active');
}
