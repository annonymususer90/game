/**
 * @swagger
 * tags:
 *   name: 
 *   description: API endpoints
 * 
 * @openapi
 * /login:
 *   post:
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: url
 *         description: The URL to login to
 *         in: body
 *         required: true
 *         type: string
 *       - name: username
 *         description: The username for login
 *         in: body
 *         required: true
 *         type: string
 *       - name: password
 *         description: The password for login
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Login unsuccessful
 *       500:
 *         description: Internal server error
 */


module.exports = {
    defaultPassword: 'Abcd@332211',
}