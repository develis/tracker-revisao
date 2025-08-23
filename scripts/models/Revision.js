export default class Revision {
    constructor(id, type, scheduledDate) {
        this.id = id;
        this.type = type;
        this.scheduledDate = scheduledDate;
        this.completed = false;
        this.completedDate = null;
        this.successRate = null;
    }

    isOverdue() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduled = new Date(this.scheduledDate);
        return !this.completed && scheduled < today;
    }

    getStatus() {
        if (this.completed) {
            return {
                label: 'Concluído',
                class: 'bg-success',
                rate: this.successRate
            };
        }
        if (this.isOverdue()) {
            return {
                label: 'Atrasada',
                class: 'bg-danger',
                rate: null
            };
        }
        return {
            label: 'Pendente',
            class: 'bg-warning text-dark',
            rate: null
        };
    }
}