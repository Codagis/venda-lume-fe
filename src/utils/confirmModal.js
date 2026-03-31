import { Modal } from 'antd'

/**
 * Modal de confirmação para exclusões (substitui Popconfirm com experiência mais clara).
 * onOk pode ser async; o botão OK fica em loading até concluir.
 */
export function confirmDeleteModal({
  title,
  description = 'Esta ação não pode ser desfeita.',
  okText = 'Excluir',
  cancelText = 'Cancelar',
  onOk,
}) {
  Modal.confirm({
    title,
    content: description,
    okText,
    okType: 'danger',
    cancelText,
    centered: true,
    maskClosable: true,
    onOk,
  })
}

export function confirmLogoutModal({ onOk }) {
  Modal.confirm({
    title: 'Sair do sistema?',
    content: 'Você precisará entrar novamente para acessar o VendaLume.',
    okText: 'Sair',
    okType: 'danger',
    cancelText: 'Cancelar',
    centered: true,
    maskClosable: true,
    onOk,
  })
}
