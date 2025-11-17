describe('App loads', () => {
	it('shows the title', () => {
		cy.visit('/')
		cy.contains('Chat with MCA Syllabus').should('be.visible')
	})
})


