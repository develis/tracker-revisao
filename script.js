document.addEventListener('DOMContentLoaded', function () {
    if (!localStorage.getItem('studySubjects')) {
        localStorage.setItem('studySubjects', JSON.stringify([]));
    }

    loadSubjects();
    loadRevisions();

    document.getElementById('studyForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const subjectSelect = document.getElementById('subjectSelect');
        const customSubject = document.getElementById('customSubject').value;

        let subjectName;
        if (subjectSelect.value === 'Outro') {
            subjectName = customSubject;
        } else {
            subjectName = subjectSelect.value;
        }

        const studyDate = document.getElementById('studyDate').value;
        const successRate = parseInt(document.getElementById('successRate').value);

        if (subjectName && studyDate && !isNaN(successRate)) {
            addSubject(subjectName, studyDate, successRate);
            document.getElementById('studyForm').reset();
            document.getElementById('customSubjectContainer').style.display = 'none';
        }
    });
    
    document.getElementById('confirmCompleteRevision').addEventListener('click', function () {
        const revisionId = document.getElementById('revisionIdToComplete').value;
        const successRate = parseInt(document.getElementById('revisionSuccessRate').value);

        if (!isNaN(successRate)) {
            completeRevision(revisionId, successRate);
            const modal = bootstrap.Modal.getInstance(document.getElementById('completeRevisionModal'));
            modal.hide();
        }
    });

    document.getElementById('exportData').addEventListener('click', exportData);

    document.getElementById('importData').addEventListener('click', function () {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', importData);
});

document.getElementById('subjectSelect').addEventListener('change', function () {
    const customSubjectContainer = document.getElementById('customSubjectContainer');
    if (this.value === 'Outro') {
        customSubjectContainer.style.display = 'block';
        document.getElementById('customSubject').required = true;
    } else {
        customSubjectContainer.style.display = 'none';
        document.getElementById('customSubject').required = false;
    }
});

function addSubject(name, studyDate, successRate) {
    const subjects = JSON.parse(localStorage.getItem('studySubjects'));
    const newSubject = {
        id: Date.now().toString(),
        name: name,
        studyDate: studyDate,
        successRate: successRate,
        revisions: calculateRevisions(studyDate, successRate),
        createdAt: new Date().toISOString()
    };

    subjects.push(newSubject);
    localStorage.setItem('studySubjects', JSON.stringify(subjects));

    loadSubjects();
    loadRevisions();
}

function calculateRevisions(studyDate, successRate) {
    const firstStudyDate = new Date(studyDate);
    const revisions = [];

    const revision1Date = new Date(firstStudyDate);
    revision1Date.setDate(revision1Date.getDate() + 2);
    revisions.push({
        id: 'r1-' + Date.now(),
        type: 'Revisão 1',
        scheduledDate: revision1Date.toISOString().split('T')[0],
        completed: false,
        completedDate: null,
        successRate: null
    });

    const revision2Date = new Date(revision1Date);
    revision2Date.setDate(revision2Date.getDate() + 7);
    revisions.push({
        id: 'r2-' + Date.now(),
        type: 'Revisão 2',
        scheduledDate: revision2Date.toISOString().split('T')[0],
        completed: false,
        completedDate: null,
        successRate: null
    });

    if (successRate <= 70) {
        const revision3Date = new Date(revision2Date);
        revision3Date.setDate(revision3Date.getDate() + 15);
        revisions.push({
            id: 'r3-' + Date.now(),
            type: 'Revisão 3',
            scheduledDate: revision3Date.toISOString().split('T')[0],
            completed: false,
            completedDate: null,
            successRate: null
        });
    }

    return revisions;
}

function loadSubjects() {
    const subjects = JSON.parse(localStorage.getItem('studySubjects'));
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';

    if (subjects.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-4">Nenhum assunto cadastrado ainda.</div>';
        return;
    }

    subjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card subject-card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>${subject.name}</span>
                    <button class="btn btn-sm btn-outline-danger delete-subject" data-id="${subject.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="card-body">
                    <p class="mb-1"><strong>Primeiro estudo:</strong> ${formatDate(subject.studyDate)}</p>
                    <p class="mb-1"><strong>Taxa de acerto inicial:</strong> ${subject.successRate}%</p>
                    <p class="mb-0"><strong>Revisões:</strong> ${subject.revisions.length}</p>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.delete-subject').forEach(button => {
        button.addEventListener('click', function () {
            if (confirm('Tem certeza que deseja remover este assunto e todas as suas revisões?')) {
                deleteSubject(this.getAttribute('data-id'));
            }
        });
    });
}

function loadRevisions() {
    const subjects = JSON.parse(localStorage.getItem('studySubjects'));
    const tableBody = document.getElementById('revisionsTable');
    tableBody.innerHTML = '';

    let allRevisions = [];

    subjects.forEach(subject => {
        subject.revisions.forEach(revision => {
            allRevisions.push({
                ...revision,
                subjectId: subject.id,
                subjectName: subject.name
            });
        });
    });

    allRevisions.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    if (allRevisions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">Nenhuma revisão agendada.</td>
            </tr>
        `;
        return;
    }

    allRevisions.forEach(revision => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(revision.scheduledDate);

        let status = '';
        let rowClass = '';

        if (revision.completed) {
            status = `<span class="badge bg-success">Concluído (${revision.successRate}%)</span>`;
            rowClass = 'completed';
        } else if (scheduledDate < today) {
            status = '<span class="badge bg-danger">Atrasada</span>';
            rowClass = 'missed';
        } else {
            status = '<span class="badge bg-warning text-dark">Pendente</span>';
            rowClass = 'pending';
        }

        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td>${revision.subjectName}</td>
            <td>${revision.type}</td>
            <td>${formatDate(revision.scheduledDate)}</td>
            <td>${status}</td>
            <td>
                ${!revision.completed ? `
                    <button class="btn btn-sm btn-success complete-revision" data-id="${revision.id}" data-subject-id="${revision.subjectId}">
                        <i class="bi bi-check"></i> Concluir
                    </button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.complete-revision').forEach(button => {
        button.addEventListener('click', function () {
            const revisionId = this.getAttribute('data-id');
            const subjectId = this.getAttribute('data-subject-id');

            document.getElementById('revisionIdToComplete').value = revisionId;
            document.getElementById('completeRevisionForm').setAttribute('data-subject-id', subjectId);
            document.getElementById('revisionSuccessRate').value = '';

            const modal = new bootstrap.Modal(document.getElementById('completeRevisionModal'));
            modal.show();
        });
    });
}

function completeRevision(revisionId, successRate) {
    const subjectId = document.getElementById('completeRevisionForm').getAttribute('data-subject-id');
    const subjects = JSON.parse(localStorage.getItem('studySubjects'));

    const subjectIndex = subjects.findIndex(s => s.id === subjectId);
    if (subjectIndex === -1) return;

    const revisionIndex = subjects[subjectIndex].revisions.findIndex(r => r.id === revisionId);
    if (revisionIndex === -1) return;

    subjects[subjectIndex].revisions[revisionIndex].completed = true;
    subjects[subjectIndex].revisions[revisionIndex].completedDate = new Date().toISOString().split('T')[0];
    subjects[subjectIndex].revisions[revisionIndex].successRate = successRate;

    if (subjects[subjectIndex].revisions[revisionIndex].type === 'Revisão 2' && successRate <= 70) {
        const hasRevision3 = subjects[subjectIndex].revisions.some(r => r.type === 'Revisão 3');

        if (!hasRevision3) {
            const revision2Date = new Date(subjects[subjectIndex].revisions[revisionIndex].scheduledDate);
            const revision3Date = new Date(revision2Date);
            revision3Date.setDate(revision3Date.getDate() + 15);

            subjects[subjectIndex].revisions.push({
                id: 'r3-' + Date.now(),
                type: 'Revisão 3',
                scheduledDate: revision3Date.toISOString().split('T')[0],
                completed: false,
                completedDate: null,
                successRate: null
            });
        }
    }

    localStorage.setItem('studySubjects', JSON.stringify(subjects));
    loadSubjects();
    loadRevisions();
}

function deleteSubject(subjectId) {
    let subjects = JSON.parse(localStorage.getItem('studySubjects'));
    subjects = subjects.filter(subject => subject.id !== subjectId);
    localStorage.setItem('studySubjects', JSON.stringify(subjects));
    loadSubjects();
    loadRevisions();
}

function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

function exportData() {
    const subjects = JSON.parse(localStorage.getItem('studySubjects'));
    if (subjects.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    const dataStr = JSON.stringify(subjects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `revisoes-estudos-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (confirm('Importar dados substituirá todos os dados atuais. Deseja continuar?')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedData = JSON.parse(e.target.result);

                if (Array.isArray(importedData)) {
                    localStorage.setItem('studySubjects', JSON.stringify(importedData));
                    loadSubjects();
                    loadRevisions();
                    alert('Dados importados com sucesso!');
                } else {
                    alert('O arquivo não contém dados válidos.');
                }
            } catch (error) {
                alert('Erro ao ler o arquivo. Certifique-se de que é um JSON válido.');
                console.error(error);
            }

            event.target.value = '';
        };
        reader.readAsText(file);
    } else {
        event.target.value = '';
    }
}