import { Modal } from 'antd'

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
