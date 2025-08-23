import Subject from '../models/Subject.js';
import Revision from '../models/Revision.js';

export default class ReviewSystem {
    constructor() {
        this.categoriesData = {};
        this.subjects = [];
        this.currentSortKey = null;
        this.currentSortDirection = 'asc';
        this.setupEventListeners();
        this.loadData();
    }

    async loadData() {
        await this.loadCategories();
        this.loadSubjectsFromStorage();
        this.renderAll();
    }

    setupEventListeners() {
        document.getElementById('studyForm').addEventListener('submit', this.handleFormSubmit.bind(this));
        document.getElementById('categorySelect').addEventListener('change', this.handleCategoryChange.bind(this));
        document.getElementById('subjectSelect').addEventListener('change', this.handleSubjectChange);
        document.getElementById('confirmCompleteRevision').addEventListener('click', this.handleCompleteRevision.bind(this));
        document.getElementById('exportData').addEventListener('click', this.exportData.bind(this));
        document.getElementById('importData').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', this.importData.bind(this));
        this.setupTableSorting();
    }

    async loadCategories() {
        try {
            const response = await fetch('static/json/subjects.json');
            this.categoriesData = await response.json();
            const select = document.getElementById('categorySelect');
            select.innerHTML = '<option value="" selected disabled>Selecione uma categoria</option>';
            Object.keys(this.categoriesData).forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar as categorias:', error);
        }
    }

    loadSubjectsFromStorage() {
        const storedSubjects = JSON.parse(localStorage.getItem('studySubjects') || '[]');
        this.subjects = storedSubjects.map(s => {
            const revisions = s.revisions.map(r => new Revision(r.id, r.type, r.scheduledDate));
            revisions.forEach((rev, i) => Object.assign(rev, s.revisions[i]));
            return new Subject(s.id, s.name, s.studyDate, s.successRate, revisions);
        });
    }

    saveSubjectsToStorage() {
        localStorage.setItem('studySubjects', JSON.stringify(this.subjects));
    }

    renderAll() {
        this.renderSubjects();
        this.renderRevisions();
    }

    handleFormSubmit(e) {
        e.preventDefault();
        const category = document.getElementById('categorySelect').value;
        const subjectSelect = document.getElementById('subjectSelect');
        const selectedSubject = subjectSelect.value;
        const customSubjectInput = document.getElementById('customSubject').value.trim();
        const studyDateInput = document.getElementById('studyDate').value;
        const totalQuestions = parseInt(document.getElementById('totalQuestions').value);
        const correctAnswers = parseInt(document.getElementById('correctAnswers').value);

        if (!category || (!selectedSubject && !customSubjectInput) || !studyDateInput || isNaN(totalQuestions) || isNaN(correctAnswers) || totalQuestions <= 0 || correctAnswers < 0 || correctAnswers > totalQuestions) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        const subjectToUse = selectedSubject === 'Outro' ? customSubjectInput : selectedSubject;
        const successRate = Math.round((correctAnswers / totalQuestions) * 100);

        const newSubject = Subject.createNew(category, subjectToUse, studyDateInput, successRate);
        this.subjects.push(newSubject);
        this.saveSubjectsToStorage();
        this.renderAll();
        e.target.reset();
        document.getElementById('subjectSelect').disabled = true;
        document.getElementById('customSubject').style.display = 'none';
        document.getElementById('customSubject').required = false;
    }

    handleCategoryChange(e) {
        const selectedCategory = e.target.value;
        const subjectSelect = document.getElementById('subjectSelect');
        const customSubjectInput = document.getElementById('customSubject');
        subjectSelect.innerHTML = '<option value="" selected disabled>Selecione um assunto</option>';
        customSubjectInput.style.display = 'none';
        customSubjectInput.value = '';

        if (selectedCategory && this.categoriesData[selectedCategory]) {
            this.categoriesData[selectedCategory].forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelect.appendChild(option);
            });
            subjectSelect.disabled = false;
        } else {
            subjectSelect.disabled = true;
        }
    }

    handleSubjectChange(e) {
        const customSubjectInput = document.getElementById('customSubject');
        if (e.target.value === 'Outro') {
            customSubjectInput.style.display = 'block';
            customSubjectInput.required = true;
        } else {
            customSubjectInput.style.display = 'none';
            customSubjectInput.required = false;
            customSubjectInput.value = '';
        }
    }

    handleCompleteRevision() {
        const revisionId = document.getElementById('revisionIdToComplete').value;
        const subjectId = document.getElementById('completeRevisionForm').getAttribute('data-subject-id');
        const totalQuestions = parseInt(document.getElementById('revisionTotalQuestions').value);
        const correctAnswers = parseInt(document.getElementById('revisionCorrectAnswers').value);

        if (isNaN(totalQuestions) || isNaN(correctAnswers) || totalQuestions <= 0 || correctAnswers < 0 || correctAnswers > totalQuestions) {
            alert('Preencha corretamente o número de questões e acertos.');
            return;
        }

        const successRate = Math.round((correctAnswers / totalQuestions) * 100);

        const subject = this.subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const revision = subject.revisions.find(r => r.id === revisionId);
        if (!revision) return;

        revision.completed = true;
        revision.completedDate = new Date().toISOString().split('T')[0];
        revision.successRate = successRate;

        if (revision.type === 'Revisão 2' && successRate <= 70) {
            const hasRevision3 = subject.revisions.some(r => r.type === 'Revisão 3');
            if (!hasRevision3) {
                subject.addRevision('Revisão 3', successRate);
            }
        }

        this.saveSubjectsToStorage();
        this.renderAll();
        const modal = bootstrap.Modal.getInstance(document.getElementById('completeRevisionModal'));
        modal.hide();
    }

    deleteSubject(subjectId) {
        this.subjects = this.subjects.filter(s => s.id !== subjectId);
        this.saveSubjectsToStorage();
        this.renderAll();
    }

    renderSubjects() {
        const container = document.getElementById('subjectsContainer');
        container.innerHTML = '';
        if (this.subjects.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-4">Nenhum assunto cadastrado ainda.</div>';
            return;
        }

        this.subjects.forEach(subject => {
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
                        <p class="mb-1"><strong>Primeiro estudo:</strong> ${this.formatDate(subject.studyDate)}</p>
                        <p class="mb-1"><strong>Taxa de acerto inicial:</strong> ${subject.successRate}%</p>
                        <p class="mb-0"><strong>Revisões:</strong> ${subject.revisions.length}</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        document.querySelectorAll('.delete-subject').forEach(button => {
            button.addEventListener('click', (e) => {
                if (confirm('Tem certeza que deseja remover este assunto e todas as suas revisões?')) {
                    this.deleteSubject(e.target.closest('button').getAttribute('data-id'));
                }
            });
        });
    }

    renderRevisions() {
        const tableBody = document.getElementById('revisionsTable');
        tableBody.innerHTML = '';
        let allRevisions = this.subjects.flatMap(subject => {
            const [category, ...subjectParts] = subject.name.split(' - ');
            const subjectName = subjectParts.join(' - ');
            return subject.revisions.map(rev => ({
                ...rev,
                subjectId: subject.id,
                categoria: category,
                assunto: subjectName
            }));
        });

        if (this.currentSortKey) {
            allRevisions.sort((a, b) => {
                let valA, valB;
                switch (this.currentSortKey) {
                    case 'categoria':
                    case 'assunto':
                    case 'tipo':
                        valA = a[this.currentSortKey]?.toLowerCase() || '';
                        valB = b[this.currentSortKey]?.toLowerCase() || '';
                        break;
                    case 'data':
                        valA = new Date(a.scheduledDate);
                        valB = new Date(b.scheduledDate);
                        break;
                    case 'status':
                        valA = this.getStatusOrder(a);
                        valB = this.getStatusOrder(b);
                        break;
                    default:
                        valA = '';
                        valB = '';
                }
                if (valA < valB) return this.currentSortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.currentSortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        if (allRevisions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma revisão agendada.</td></tr>';
            return;
        }

        allRevisions.forEach(revisionData => {
            const revision = new Revision(revisionData.id, revisionData.type, revisionData.scheduledDate);
            Object.assign(revision, revisionData);
            const status = revision.getStatus();
            const rowClass = revision.completed ? 'completed' : (revision.isOverdue() ? 'missed' : 'pending');

            const row = document.createElement('tr');
            row.className = rowClass;
            row.innerHTML = `
                <td>${revisionData.categoria}</td>
                <td>${revisionData.assunto}</td>
                <td>${revisionData.type}</td>
                <td>${this.formatDate(revisionData.scheduledDate)}</td>
                <td><span class="badge ${status.class}">${status.label}${status.rate !== null ? ` (${status.rate}%)` : ''}</span></td>
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
            button.addEventListener('click', (e) => {
                const revisionId = e.target.closest('button').getAttribute('data-id');
                const subjectId = e.target.closest('button').getAttribute('data-subject-id');
                document.getElementById('revisionIdToComplete').value = revisionId;
                document.getElementById('completeRevisionForm').setAttribute('data-subject-id', subjectId);
                document.getElementById('revisionTotalQuestions').value = '';
                document.getElementById('revisionCorrectAnswers').value = '';
                const modal = new bootstrap.Modal(document.getElementById('completeRevisionModal'));
                modal.show();
            });
        });
    }

    setupTableSorting() {
        const headers = document.querySelectorAll('thead th[data-sort-key]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const key = header.getAttribute('data-sort-key');
                if (this.currentSortKey === key) {
                    this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSortKey = key;
                    this.currentSortDirection = 'asc';
                }
                this.renderRevisions();
            });
        });
    }

    getStatusOrder(rev) {
        if (rev.completed) return 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(rev.scheduledDate);
        return scheduledDate < today ? 3 : 2;
    }

    formatDate(dateString) {
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        };
        return new Date(dateString).toLocaleDateString('pt-BR', options);
    }

    exportData() {
        if (this.subjects.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }
        const dataStr = JSON.stringify(this.subjects, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `revisoes-estudos-${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (confirm('Importar dados substituirá todos os dados atuais. Deseja continuar?')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (Array.isArray(importedData)) {
                        localStorage.setItem('studySubjects', JSON.stringify(importedData));
                        this.loadSubjectsFromStorage();
                        this.renderAll();
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
}